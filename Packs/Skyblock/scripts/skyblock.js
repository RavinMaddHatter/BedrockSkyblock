import { world, system } from '@minecraft/server';
import {ModalFormData } from "@minecraft/server-ui";

var uiLoop = 0
var challengeMode = "Classic"
var saplingType = "Random" 
var searchQueued=false
var moderator
var scatterMax = Math.floor(200)
var spawnLocation 
var playersSearching = []
var islands = []
var softLockcount=0
var softlock
var netherRoof
var freshLoad=true
const searchPattern = [[0,0],[0,16],[16,16],[0,16],[-16,16],[-16,0],[-16,-16],[0,-16],[16,-16],[32,0],[32,16],[32,32],[16,32],[0,32],[-16,32],[-32,32],[-32,16],[-32,0],[-32,-16],[-32,-32],[-16,-32],[0,-32],[16,-32],[32,-32],[32,-16],[48,0],[-48,0],[0,48],[0,-48],[48,16],[-48,16],[16,48],[16,-48],[48,-16],[-48,0],[-16,48],[-16,-48],[48,32],[-48,32],[32,48],[32,-48],[48,-32],[-48,-32],[-32,48],[-32,-48]]//
const gameTypes = ["Island on Death", "No Regen" ,"Island Per User" ,"Classic" ,"Pillowcore"]
const challengeModes = ["Classic", "Nether Start", "No Items"]
const saplings = {"Oak":"sapling 1 0",
				"Spruce":"sapling 1 1" , 
				"Acacia":"sapling 1 4",
				"Dark Oak":"sapling 4 5",
				"Birch": "sapling 1 2",
				"Jungle": "sapling 1 3",
				"Bamboo": "bamboo", 
				"Cherry": "cherry_sapling",
				"Random":"Random",
				"None":"None"}


let worldConfigured=world.getDynamicProperty("worldConfigured")
if (typeof worldConfigured!== "undefined"){//if skyblock settigns are not saved, try and set up the server.
	let sapIndex = world.getDynamicProperty("sapIndex")//Loading settings
	let styleIdx = world.getDynamicProperty("styleIdx")//Loading settings
	scatterMax = world.getDynamicProperty("scatterMax")//Loading settings
	netherRoof = world.getDynamicProperty("NetherRoof")//Loading settings
	let saplingTypes=Object.keys(saplings)//getting keys for sappling types
	saplingType = saplingTypes[sapIndex]//loading the sappling selected
	challengeMode = challengeModes[styleIdx]//Loading loading challeng mode
	if(netherRoof && freshLoad){
		system.runInterval(setNetherRoof,10)
		freshLoad=false
	}
}
// subscriptions
world.afterEvents.entityDie.subscribe((event) => {//handles on death 
	if(event.deadEntity.typeId == "minecraft:player"){
		event.deadEntity.addTag("respawn")//Setup to give items on respawn and know that this is a death
		switch(getGamemode()){
			case "Island Per User":
			case "Island on Death":
			case "Pillowcore":
			case "No Regen":// Fall through to Hard core. Nothing is different about UH
				break;
		}
	}
});

world.afterEvents.playerSpawn.subscribe((event) =>{
	let player = event.player
	let worldConfigured=world.getDynamicProperty("worldConfigured")
	if (event.player.hasTag("respawn")){
		respawnPlayer(player)
	}
	if (!worldConfigured){//if skyblock settigns are not saved, try and set up the server.
		moderator=player
		player.setDynamicProperty("spawned",true)
		serverSetup()
	}
	if(!player.getDynamicProperty("spawned")){
		player.setDynamicProperty("spawned",true)
		respawnPlayer(player)
	}
});

// Actions 

function setNetherRoof(){
	for (let player of world.getAllPlayers()){
		if(player.dimension.id==="minecraft:nether"){
			let playerchunk=player.location
			playerchunk.x=playerchunk.x-playerchunk.x%16
			playerchunk.z=playerchunk.z-playerchunk.z%16
			playerchunk.y=127
			for(let offset of searchPattern){
				let checkchunk={x:playerchunk.x+offset[0],y:127,z:playerchunk.z+offset[1]}
				let block = player.dimension.getBlock(checkchunk);
				if (block){
					if(block.type.id == "minecraft:air"){
						player.runCommandAsync(`fill ${checkchunk.x-16} ${checkchunk.y} ${checkchunk.z-16} ${checkchunk.x+16} ${checkchunk.y} ${checkchunk.z+16} barrier`)
					}
				}
			}//
		}
	}
}
function serverSetup(){
	spawnLocation = world.getDefaultSpawnLocation()
	moderator.runCommand(`setblock ${spawnLocation.x} 319 ${spawnLocation.z} barrier`)
	moderator.runCommand(`tp @s ${spawnLocation.x} 322 ${spawnLocation.z}`)
	uiLoop = system.runTimeout(showSetupMenu,10)//this 
}
function itemsOnSpawn(player){
	if(player.hasTag("respawn")){// if spawning a player after death or for the first time
		player.removeTag("respawn")// remove the tag saying we are spawning
		switch(challengeMode){//check the challenge mode
			case "Classic"://classic game rules
				if(!player.hasTag("first_spawn")){
					player.runCommandAsync("give @s ice")// give ice
					player.runCommandAsync("give @s lava_bucket")// give lava
					giveSappling(player)//give a sapling
				}
				break;
			case "Nether Start"://if you are starting in the nether, different saplings are given
				spawnInNether(player)
				if ([true,false].sample()){
					player.runCommandAsync("give @s warped_fungus 2")//warped fungus
					player.runCommandAsync("give @s warped_nylium 4")//giving 4 nylium to support growing more nylium if the first dies
					player.runCommandAsync("give @s bone_meal 10")// i estimate you need like 2 to get it to grow but you will need a bunch of you land on the wrong island
				}
				else{
					player.runCommandAsync("give @s crimson_fungus 2")//give crimson
					player.runCommandAsync("give @s crimson_nylium 4")//giving 4 nylium to support growing more nylium if the first dies and getting more saps
					player.runCommandAsync("give @s bone_meal 10")// i estimate you need like 2 to get it to grow
				}
				break;
			case "No Items"://this is for the no-items mode, as of right now nothing happens. but keeping it in the switch just in case
				break;
			default:
				break;
		}
	}
}

function respawnPlayer(player){
	if(!player.hasTag("setup")){//checkes if player has ever joined before
		player.addTag("respawn")//readies a spawn attempt
		player.addTag("setup")// adds the setup to know the player has joined previously
	}
	switch(getGamemode()){
		case "Island Per User":
			itemsOnSpawn(player);
			if (!player.getDynamicProperty("islandX")){//if actual spawnpoint recorded, then respawn player there
				telleportRandom(player);
				queuePlayer(player);//insures safe spawn
			}else if ( player.getSpawnPoint() === undefined){//check if player has previously spawned, but spawnpoint is reset
				player.setSpawnPoint({
					dimension:player.dimension,
					x:player.getDynamicProperty("islandX"),
					y:player.getDynamicProperty("islandY"),
					z:player.getDynamicProperty("islandZ")});//reset player spawnpoint to island if it's been cleared, e.g. by breaking bed
			}
			
			
			break;
		case "No Regen":// Fall through to Hard core. Nothing is different about UHC
		case "Hardcore":
		case "Island on Death":
			itemsOnSpawn(player);
			telleportRandom(player)
			queuePlayer(player)//insures safe spawn
			break;
		case "Classic":
			itemsOnSpawn(player);
			if(!player.hasTag("first_spawn")){
				queuePlayer(player)//insures safe spawn
			}
			break;
		case "Pillowcore":
			if(player.getSpawnPoint() === undefined && player.hasTag("respawn")){
				itemsOnSpawn(player);
				telleportRandom(player)
				queuePlayer(player)//insures safe spawn
			}
			// Otherwise for Pillowcore we just fall through to regular spawnning
			break;
	}
}

function randomSap(){//set up to allow recursive search to prevent geting none or random
	let options = Object.keys(saplings)//get a list of options
	let item = options.sample()//get a random key from the saplings options
	if (item === "Random" || item === "None"){//check if random or none and try again
		return randomSap()//Recurive execution to get rid of Random and None... Lazy
	}else{
		return item//return the item
	}
}
function giveSappling(player){
	let item = saplings[saplingType]//gets the sapling setting if static
	if (item === "Random"){
		item=saplings[randomSap()]
	}
	player.runCommandAsync("give @s "+item)
	player.runCommandAsync("give @s dirt 4")
}
function spawnInNether(player){
	player.teleport({x:0,y:72,z:0},{dimension:world.getDimension("minecraft:nether")})
}

function telleportRandom(player){
	const factors = [[-25, -25], [-25, 1], [-23, -17], [-23, 9], [-21, -5], [-21, 21], [-19, -11], [-19, 15], [-23, -17], [-17, 3], [-15, -7], [-15, 19], [-19, -11], [-11, 7], [-9, -3], [-9, 23], [-15, -7], [-7, 11], [-21, -5], [-5, 5], [-9, -3], [-3, 17], [-1, -1], [-1, 25], [-25, 1], [1, 1], [-17, 3], [3, 9], [-5, 5], [5, 21], [-11, 7], [7, 15], [-23, 9], [3, 9], [-7, 11], [11, 19], [-19, 15], [7, 15], [-3, 17], [17, 23], [-15, 19], [11, 19], [-21, 21], [5, 21], [-9, 23], [17, 23], [-1, 25], [25, 25]]
	let base = factors[Math.floor(Math.random()*factors.length)]
	if (Math.round(Math.random())){
		base=base.reverse();
	}
	let maxChunk = scatterMax/(16*26)
	base[0]=base[0]+Math.floor(Math.random()*maxChunk)*26*base[0]/Math.abs(base[0])
	base[1]=base[1]+Math.floor(Math.random()*maxChunk)*26*base[1]/Math.abs(base[1])
	player.teleport({x:base[0]*16+8,y:319,z:base[1]*16+8});
}
	
function lookForSafety(player){
	let searchFail=true//sets default to retry
	let centerBlock={x:player.location.x,//finds center if chunk
					 y: 70,//block in every island
					 z: player.location.z}//finds center if chunk
	let block = player.dimension.getBlock(centerBlock)
	let skipped=0
	if(typeof block !=="undefined"){
		for(let y = 60;  y<250;y++){
			block = player.dimension.getBlock({x:centerBlock.x,y:y,z:centerBlock.z});
			let feet = player.dimension.getBlock({x:centerBlock.x,y:y+1,z:centerBlock.z});
			let head = player.dimension.getBlock({x:centerBlock.x,y:y+2,z:centerBlock.z});
			if(!block.isAir && feet.isAir&&head.isAir){
				player.teleport({x:centerBlock.x,y:y+1,z:centerBlock.z});
				if (getGamemode() === "Island Per User"){
					player.setDynamicProperty("islandX", centerBlock.x);
					player.setDynamicProperty("islandZ", centerBlock.z);
				}
				searchFail=false;
				break;
			}
		}
		if(searchFail){
			telleportRandom(player)
			queuePlayer(player)
		}else if(getGamemode()==="Classic" && (challengeModes !=="Nether Start") && (!player.hasTag("first_spawn"))){//function is also called at summon to set world spawn safely if in classic mode
			world.setDefaultSpawnLocation({x:player.location.x, y:(player.location.y+1), z:player.location.z})//set worldspawn after island search completes
			player.addTag("first_spawn")//add tag to record that player has already spawned previously
		}else if(getGamemode()==="Island Per User" && (!player.hasTag("first_spawn"))){
			player.setSpawnPoint({dimension:player.dimension, x:player.location.x, y:(player.location.y+1), z:player.location.z})//set player spawnpoint after first island search completes
			if(world.getDefaultSpawnLocation().x == 0 && world.getDefaultSpawnLocation().z == 0){//check if worldspawn hasn't been set to a real location yet
				world.setDefaultSpawnLocation({x:player.location.x, y:(player.location.y+1), z:player.location.z})//set worldspawn after island search completes
			}
			player.setDynamicProperty("islandX",player.location.x)//record player spawnpoint x
			player.setDynamicProperty("islandY",player.location.y+1)//record player spawnpoint y
			player.setDynamicProperty("islandZ",player.location.z)//record player spawnpoint z
			player.addTag("first_spawn")//add tag to record that player has already spawned previously
		}
		player.removeTag("setup")
	}else{
		queuePlayer(player)
	}
}
function queuePlayer(player){
	player.runCommandAsync("tp @s ~ 319 ~")
	playersSearching.push(player)// sets this player to be searched again in the future
	if (!searchQueued){// if someone else is already queued the search dont queue it again
		searchQueued=true// queue the search
		system.runTimeout(allSearch,10)// give the world 1 second to load before checking blocks
	}
}
function allSearch(){
	searchQueued=false
	if (softlock){
		softLockcount+=1
	}
	softlock=false
	let tempplayersSearching=playersSearching
	playersSearching=[]
	for(let player of tempplayersSearching){
		lookForSafety(player)
	}
	
}
function showSetupMenu(){
	let setupForm = new ModalFormData()
	setupForm.title("Change Game Settings")
	setupForm.dropdown("Game Style",gameTypes, 0)
	setupForm.dropdown("Sapling",Object.keys(saplings), 0)
	setupForm.dropdown("Challenge Mode",challengeModes, 0)
	setupForm.textField("Scatter Max", "3000", "3000")// done
	setupForm.textField("Random Tick Speed", "1", "1")// done
	setupForm.toggle("Nether Roof (allows Natural Ghasts)")
	setupForm.show(moderator).then((response)=> {
		if (response.canceled) {
			system.runTimeout(showSetupMenu,1)
			return;
		}
		let gameStyle = response.formValues[0]
		let sapIndex = response.formValues[1]
		let styleIdx = response.formValues[2]
		scatterMax = response.formValues[3]
		let randomTick = response.formValues[4]
		let netherRoof = response.formValues[5]
		moderator.runCommandAsync("gamerule sendcommandfeedback false")
		switch(getGamemode()){
			case "No Regen":
				moderator.runCommandAsync("gamerule naturalregeneration false")
				break;
			default:
				moderator.runCommandAsync("gamerule naturalregeneration true")
				break;
		}
		if(isNumeric(randomTick)){
			moderator.runCommandAsync("gamerule randomtickspeed " + randomTick)
		}
		if(isNumeric(scatterMax)){
			scatterMax=parseInt(scatterMax);
		}
		let saplingTypes=Object.keys(saplings)
		saplingType = saplingTypes[sapIndex]
		challengeMode = challengeModes[styleIdx]
		world.setDefaultSpawnLocation({x:0,y:72,z:0})
		
		world.setDynamicProperty("gameStyle", gameStyle)
		world.setDynamicProperty("sapIndex", sapIndex)
		world.setDynamicProperty("styleIdx", styleIdx)
		world.setDynamicProperty("scatterMax", scatterMax)
		world.setDynamicProperty("NetherRoof", netherRoof)
		if(netherRoof){
			system.runInterval(setNetherRoof,10)
		}
		
		system.clearRun(uiLoop)
		moderator.runCommand(`setblock ${spawnLocation.x} 319 ${spawnLocation.z} air`)
		worldConfigured=world.setDynamicProperty("worldConfigured",true)
		respawnPlayer(moderator)
	});
}
function getGamemode(){
	let gamemode=gameTypes[world.getDynamicProperty("gameStyle")]
	return gamemode
}
//helper functions
Array.prototype.sample = function(){
  return this[Math.floor(Math.random()*this.length)];
}
function isNumeric(str) {
  if (typeof str != "string") return false // we only process strings!  
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}
function sayInChat(target,text){
	text=text.split("minecraft:").join("")
	target.runCommandAsync('tellraw @s {"rawtext":[{"text":"'+text+'"}]}')
}
function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}
