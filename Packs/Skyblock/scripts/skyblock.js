import { world, system } from '@minecraft/server';
import {ModalFormData } from "@minecraft/server-ui";

var uiLoop = 0
var challengeMode = "Classic"
var saplingType = "Random" 
var searchQueued=false
var moderator
var scatterMax = Math.floor(3000)
var spawnLocation 
var playersSearching = []
var softLockcount=0
var softlock
var netherRoof
var freshLoad=true
const searchPattern = [[0,0],[0,16],[16,16],[0,16],[-16,16],[-16,0],[-16,-16],[0,-16],[16,-16],[32,0],[32,16],[32,32],[16,32],[0,32],[-16,32],[-32,32],[-32,16],[-32,0],[-32,-16],[-32,-32],[-16,-32],[0,-32],[16,-32],[32,-32],[32,-16],[48,0],[-48,0],[0,48],[0,-48],[48,16],[-48,16],[16,48],[16,-48],[48,-16],[-48,0],[-16,48],[-16,-48],[48,32],[-48,32],[32,48],[32,-48],[48,-32],[-48,-32],[-32,48],[-32,-48]]//
const gameTypes = ["Semi Hardcore", "Hardcore", "Ultra Hardcore" ,"Island Per User" ,"Classic" ,"Pillowcore"]
const challengeModes = ["Classic", "Nether Start", "No Items"]
const scoreTypes = ["Death Counter", "Kill Counter","None"]
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


let settings=world.scoreboard.getObjective("Skyblock Settings")
if (typeof settings!== "undefined"){//if skyblock settigns are not saved, try and set up the server.
	let sapIndex = settings.getScore("sapIndex")//Loading settings
	let styleIdx = settings.getScore("styleIdx")//Loading settings
	scatterMax = settings.getScore("scatterMax")//Loading settings
	netherRoof = settings.getScore("NetherRoof")//Loading settings
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
		let player = event.deadEntity//set the player up so it is cleaner to access
		world.scoreboard.getObjective("Death Counter").addScore(player,1)//death counter score board.
		player.addTag("respawn")//Setup to give items on respawn and know that this is a death
		switch(getGamemode()){
			case "Island Per User":
			case "Semi Hardcore":
			case "Pillowcore":
				break;
			case "Ultra Hardcore":// Fall through to Hard core. Nothing is different about UHC
			case "Hardcore":// set spectator for hardcore
				player.runCommandAsync("gamemode spectator @s")// place player in spectator
		}
	}
	else{
		if(typeof event.damageSource !== "undefined"){
			console.warn("damagesource:" + event);
			let killer = event.damageSource.damagingEntity//gets the player who killed the entity
			if (killer.typeId  == "minecraft:player"){//if the damage source was a player
				world.scoreboard.getObjective("Kill Counter").addScore(killer,1)//add to kill counter
			}
		}
	}
});

world.afterEvents.playerSpawn.subscribe((event) =>{
	let player = event.player
	let settings=world.scoreboard.getObjective("Skyblock Settings")
	if (settings=== undefined){//if skyblock settigns are not saved, try and set up the server.
		moderator=player
		serverSetup()
	}
	else{
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
				if(player.runCommand(`testforblock ${checkchunk.x+8} ${checkchunk.y} ${checkchunk.z+8} barrier`).successCount==0){
					player.runCommandAsync(`fill ${checkchunk.x-16} ${checkchunk.y} ${checkchunk.z-16} ${checkchunk.x+16} ${checkchunk.y} ${checkchunk.z+16} barrier`)
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

function respawnPlayer(player){
	if(!player.hasTag("setup")){//checkes if player has ever joined before
		player.addTag("respawn")//readies a spawn attempt
		player.addTag("setup")// adds the setup to know the player has joined previously
	}

	if (player.hasTag("respawn")){
		player.removeTag("respawn")// remove the tag saying we are spawning
		switch(getGamemode()){
			case "Island Per User":
				itemsOnSpawn(player);
				if(player.getSpawnPoint() === undefined && world.scoreboard.getObjective("sPointX") !== undefined && world.scoreboard.getObjective("sPointZ") !== undefined){//check if player spawnpoint has been reset and has already had a island spawnpoint recorded in scoreboard
					if(world.scoreboard.getObjective("sPointX").hasParticipant(player) && world.scoreboard.getObjective("sPointZ").hasParticipant(player)){	
						let spX = world.scoreboard.getObjective("sPointX").getScore(player)//set x variable from island spawnpoint in scoreboard
						let spZ = world.scoreboard.getObjective("sPointZ").getScore(player)//set z variable from island spawnpoint in scoreboard
						player.setSpawnPoint({dimension:player.dimension, x:spX, y:78, z:spZ})//reset player spawnpoint to island if it's been cleared by breaking bed
					}
				}
				if(world.scoreboard.getObjective("LocX").hasParticipant(player)){
					if(player.getSpawnPoint().x != 0 && player.getSpawnPoint().z != 0){
						let x = world.scoreboard.getObjective("LocX").getScore(player)
						let z = world.scoreboard.getObjective("LocZ").getScore(player)
						player.runCommandAsync(`spreadplayers ${x} ${z} 1 10 @s`)
					}
				}else{
					telleportRandom(player)
					queuePlayer(player)//insures safe spawn
				}
				break;
			case "Ultra Hardcore":// Fall through to Hard core. Nothing is different about UHC
			case "Hardcore":
			case "Semi Hardcore":
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
				if(player.getSpawnPoint() === undefined){
					itemsOnSpawn(player);
					telleportRandom(player)
					queuePlayer(player)//insures safe spawn
				}
				// Otherwise for Pillowcore we just fall through to regular spawnning
				break;
		}
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
function telleportRandom(player){
	let x = randomIntFromInterval(-scatterMax, scatterMax)//random block picked between user set distances 
	let z = randomIntFromInterval(-scatterMax, scatterMax)//random block picked between user set distances 
	player.teleport({x:x,y:319,z:z})//set up high to prevent falling to death
}
	
function lookForSafety(player){
	let searchFail=true//sets default to retry
	let centerBlock={x:player.location.x - player.location.x%16+8,//finds center if chunk
					 y: 70,//block in every island
					 z: player.location.z - player.location.z%16+8}//finds center if chunk
	let block = player.dimension.getBlock({x:centerBlock.x,y:centerBlock.y,z:centerBlock.z})
	let skipped=0
	if(typeof block !=="undefined"){
		for(let offset of searchPattern){//search pattern looks like [[0,0],[0,16],[16,16],...,[-80,0]]
			let block = player.dimension.getBlock({x:centerBlock.x+offset[0],y:centerBlock.y,z:centerBlock.z+offset[1]})
			if( typeof block ==="undefined"){
				skipped+=1
				softlock=true
			} else if (player.runCommand(`testforblock ${centerBlock.x+offset[0]} ${70} ${centerBlock.z+offset[1]} air`).successCount==0){// because block.idType isnt a thing yet and tryTeleport doesnt work.
				for(let y = 60;  y<250;y++){
					//Dont Judge me it works V
					if ((player.runCommand(`testforblock ${centerBlock.x+offset[0]} ${y} ${centerBlock.z+offset[1]} air`).successCount==0) && (player.runCommand(`testforblock ${centerBlock.x+offset[0]} ${y+2} ${centerBlock.z+offset[1]} air`).successCount>0)&& (player.runCommand(`testforblock ${centerBlock.x+offset[0]} ${y+1} ${centerBlock.z+offset[1]} air`).successCount>0)){
						player.teleport({x:centerBlock.x+offset[0],y:y+1,z:centerBlock.z+offset[1]})
						searchFail=false//dont retry
						if (getGamemode() == "Island Per User"){
							world.scoreboard.getObjective("LocX").setScore(player, centerBlock.x+offset[0])
							world.scoreboard.getObjective("LocZ").setScore(player, centerBlock.z+offset[1])
						}
						break;//exit for loop
					}
				}
				break;//exit for loop
			}
		}
		if(skipped>10){
			if(softLockcount>20){
				telleportRandom(player)
				queuePlayer(player)
			}else{
				
				queuePlayer(player)
			}
			return
		}else if(searchFail){
			telleportRandom(player)
			queuePlayer(player)
		}else if(getGamemode()==="Classic" && (challengeModes !=="Nether Start") && (!player.hasTag("first_spawn"))){//function is also called at summon to set world spawn safely if in classic mode
			world.setDefaultSpawnLocation({x:player.location.x, y:(player.location.y+2), z:player.location.z})//set worldspawn after island search completes
			player.addTag("first_spawn")//add tag to record that player has already spawned previously
		}else if(getGamemode()==="Island Per User" && (!player.hasTag("first_spawn"))){
			player.setSpawnPoint({dimension:player.dimension, x:player.location.x, y:78, z:player.location.z})//set player spawnpoint after first island search completes
			if(world.getDefaultSpawnLocation().x == 0 && world.getDefaultSpawnLocation().z == 0){//check if worldspawn hasn't been set to a real location yet
				world.setDefaultSpawnLocation({x:player.location.x, y:(player.location.y+2), z:player.location.z})//set worldspawn after island search completes
			}
			if(world.scoreboard.getObjective("sPointX") === undefined){
				world.scoreboard.addObjective("sPointX","sPointX")//add scoreboard to record player spawnpoint x
			}
			if(world.scoreboard.getObjective("sPointZ") === undefined){
				world.scoreboard.addObjective("sPointZ","sPointZ")//add scoreboard to record player spawnpoint z
			}
			world.scoreboard.getObjective("sPointX").setScore(player, player.location.x)//record player spawnpoint x
			world.scoreboard.getObjective("sPointZ").setScore(player, player.location.z)//record player spawnpoint z
			player.addTag("first_spawn")//add tag to record that player has already spawned previously
		}
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
function showSetupMenu(){
	let setupForm = new ModalFormData()
	setupForm.title("Change Game Settings")
	setupForm.dropdown("Game Style",gameTypes, 0)
	setupForm.dropdown("Sapling",Object.keys(saplings), 0)
	setupForm.dropdown("Challenge Mode",challengeModes, 0)
	setupForm.dropdown("Pause Scoreboard",scoreTypes, 0)
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
		let scoreIdx = response.formValues[3] 
		scatterMax = response.formValues[4]
		let randomTick = response.formValues[5]
		let netherRoof = response.formValues[6]
		moderator.runCommandAsync("gamerule sendcommandfeedback false")
		switch(getGamemode()){
			case "Ultra Hardcore":
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
			scatterMax=parseInt(scatterMax)
		}
		let saplingTypes=Object.keys(saplings)
		saplingType = saplingTypes[sapIndex]
		challengeMode = challengeModes[styleIdx]
		world.setDefaultSpawnLocation({x:0,y:72,z:0})
		
		world.scoreboard.addObjective("Skyblock Settings","Skyblock Settings")
		try{
			world.scoreboard.addObjective("Death Counter","Death Counter")
		}catch{
			sayInChat(moderator,"Death Counter is already setup this could result in double counting deaths")
		}
		try{
			world.scoreboard.addObjective("Kill Counter","Kill Counter")
		}catch{
			sayInChat(moderator,"Kill Counter is already setup this could result in double counting Kill")
		}
		if(scoreTypes[scoreIdx]!="None"){
			world.scoreboard.setObjectiveAtDisplaySlot("List",{objective:world.scoreboard.getObjective(scoreTypes[scoreIdx])})
		}
		world.scoreboard.getObjective("Skyblock Settings").setScore("gameStyle", gameStyle)
		world.scoreboard.getObjective("Skyblock Settings").setScore("sapIndex", sapIndex)
		world.scoreboard.getObjective("Skyblock Settings").setScore("styleIdx", styleIdx)
		world.scoreboard.getObjective("Skyblock Settings").setScore("scatterMax", scatterMax)
		world.scoreboard.getObjective("Skyblock Settings").setScore("NetherRoof", netherRoof)
		if(netherRoof){
			system.runInterval(setNetherRoof,10)
		}
		
		if(gameTypes[gameStyle]==="Island Per User"){
			try{
				world.scoreboard.addObjective("LocX","LocX")
				world.scoreboard.addObjective("LocZ","LocZ")
			}catch{}
		}
		system.clearRun(uiLoop)
		moderator.runCommand(`setblock ${spawnLocation.x} 319 ${spawnLocation.z} air`)
		switch(challengeMode){
			case "Classic":
				try{
					world.scoreboard.addObjective("LocX","LocX")
					world.scoreboard.addObjective("LocZ","LocZ")
				}catch{}
				break;
		}
		respawnPlayer(moderator)
	});
}
function getGamemode(){
	let gamemode="None"
	let settings=world.scoreboard.getObjective("Skyblock Settings")
	if (typeof settings !== "undefined"){//if skyblock settigns are not saved, try and set up the server.
		let gameStyle = settings.getScore("gameStyle")//Loading settings
		gamemode = gameTypes[gameStyle]//loading game type
	}
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
