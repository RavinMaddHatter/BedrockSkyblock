import { world, system,CommandPermissionLevel, CustomCommandParamType  } from '@minecraft/server';
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
var treeCount
var freshLoad=true
var worldConfigured
var netherRun
const searchPattern = [[0,0],[0,16],[16,16],[0,16],[-16,16],[-16,0],[-16,-16],[0,-16],[16,-16],[32,0],[32,16],[32,32],[16,32],[0,32],[-16,32],[-32,32],[-32,16],[-32,0],[-32,-16],[-32,-32],[-16,-32],[0,-32],[16,-32],[32,-32],[32,-16],[48,0],[-48,0],[0,48],[0,-48],[48,16],[-48,16],[16,48],[16,-48],[48,-16],[-48,0],[-16,48],[-16,-48],[48,32],[-48,32],[32,48],[32,-48],[48,-32],[-48,-32],[-32,48],[-32,-48]]//
const gameTypes = ["Island on Death" ,"Island Per User" ,"Classic" ,"Pillowcore"]
const challengeModes = ["Classic", "Nether Start", "No Items", "No Regen"]
const saplings = {"Oak":"sapling 1 0",
				"Spruce":"sapling 1 1" , 
				"Acacia":"sapling 1 4",
				"Dark Oak":"sapling 4 5",
				"Birch": "sapling 1 2",
				"Jungle": "sapling 1 3",
//				"Bamboo": "bamboo", 
				"Cherry": "cherry_sapling",
				"Pale Oak": "pale_oak_sapling 4",
				"Random":"Random",
				"None":"None"}
system.beforeEvents.startup.subscribe(({ customCommandRegistry  }) => {
	customCommandRegistry.registerEnum("skyblock:challengeModes", challengeModes);
	customCommandRegistry.registerEnum("skyblock:gameTypes", gameTypes);
	customCommandRegistry.registerEnum("skyblock:saplings", Object.keys(saplings));
    customCommandRegistry.registerCommand(
        {
            name: "skyblock:resetconfig",
			cheatsRequired:false,
            description: "resets the configuration of the world. you will be TPed back to 0/0",
            permissionLevel: CommandPermissionLevel.GameDirectors
        },
        (origin) => {
			moderator=origin.sourceEntity
			uiLoop = system.runTimeout(showSetupMenu,10)//this 
        }
    );
	customCommandRegistry.registerCommand(
        {
            name: "skyblock:settickspeed",
			cheatsRequired:false,
            description: "Changes the random tick speed to value",
            permissionLevel: CommandPermissionLevel.GameDirectors,
			mandatoryParameters:[{name:"tickspeed", type:"Integer"}]
		
        },
        (origin,tickspeed) => {
			system.runTimeout(function(){
				world.gameRules.randomTickSpeed=tickspeed
			})
        }
    );
	customCommandRegistry.registerCommand(
        {
            name: "skyblock:treecount",
			cheatsRequired:false,
            description: "Changes the number of fertalized trees",
            permissionLevel: CommandPermissionLevel.GameDirectors,
			mandatoryParameters:[{name:"treecount", type:"Integer"}]
		
        },
        (origin,treecount) => {
			system.runTimeout(function(){
				world.setDynamicProperty("treeCount",treecount)//Loading settings
				loadRules()
			})
        }
    );
	customCommandRegistry.registerCommand(
        {
            name: "skyblock:scattermax",
			cheatsRequired:false,
            description: "Changes the max scatter distance",
            permissionLevel: CommandPermissionLevel.GameDirectors,
			mandatoryParameters:[{name:"scattermax", type:"Integer"}]
		
        },
        (origin,scattermax) => {
			system.runTimeout(function(){
				world.setDynamicProperty("scatterMax",scattermax)//Loading settings
				loadRules()
			})
        }
    );
	customCommandRegistry.registerCommand(
        {
            name: "skyblock:netherroof",
			cheatsRequired:false,
            description: "Set nether roof. ",
            permissionLevel: CommandPermissionLevel.GameDirectors,
			mandatoryParameters:[{name:"Netherroof", type:"Boolean"}]
		
        },
        (origin,Netherroof) => {
			system.runTimeout(function(){
				world.setDynamicProperty("NetherRoof",scattermax)//Loading settings
			})
			loadRules()
        }
    );
	customCommandRegistry.registerCommand(
        {
            name: "skyblock:challengemode",
			cheatsRequired:false,
            description: "Change challenge mode",
            permissionLevel: CommandPermissionLevel.GameDirectors,
			mandatoryParameters:[{name:"skyblock:challengeModes", type:"Enum"}]
		
        },
        (origin,styleName) => {
			system.runTimeout(function(){
				world.setDynamicProperty("styleIdx",challengeModes.indexOf(styleName))
				switch(challengeModes[gameStyle]){
					case "No Regen":
						moderator.runCommand("gamerule naturalregeneration false")
						break;
					default:
						moderator.runCommand("gamerule naturalregeneration true")
						break;
				}
				loadRules()
			})
        }
    );
	customCommandRegistry.registerCommand(
        {
            name: "skyblock:sapling",
			cheatsRequired:false,
            description: "Change sapling type",
            permissionLevel: CommandPermissionLevel.GameDirectors,
			mandatoryParameters:[{name:"skyblock:saplings", type:"Enum"}]
		
        },
        (origin,styleName) => {
			system.runTimeout(function(){
				world.setDynamicProperty("sapIndex",Object.keys(saplings).indexOf(styleName))
				loadRules()
			})
        }
    );
	customCommandRegistry.registerCommand(
        {
            name: "skyblock:gametypes",
			cheatsRequired:false,
            description: "Change challenge type",
            permissionLevel: CommandPermissionLevel.GameDirectors,
			mandatoryParameters:[{name:"skyblock:gameTypes", type:"Enum"}]
		
        },
        (origin,styleName) => {
			system.runTimeout(function(){
				world.setDynamicProperty("sapIndex",gameTypes.indexOf(styleName))
				loadRules()
			})
        }
    );
	customCommandRegistry.registerCommand(
        {
            name: "skyblock:printconfig",
			cheatsRequired:false,
            description: "Will print the configuration of the server for refference.",
            permissionLevel: CommandPermissionLevel.Any
        },
        (origin) => {
			let player = origin.sourceEntity
			let sapIndex = world.getDynamicProperty("sapIndex")//Loading settings
			let styleIdx = world.getDynamicProperty("styleIdx")//Loading settings
			scatterMax = world.getDynamicProperty("scatterMax")//Loading settings
			netherRoof = world.getDynamicProperty("NetherRoof")//Loading settings
			treeCount = world.getDynamicProperty("treeCount")//Loading settings
			let saplingTypes=Object.keys(saplings)//getting keys for sappling types
			saplingType = saplingTypes[sapIndex]//loading the sappling selected
			challengeMode = challengeModes[styleIdx]//Loading loading challeng mode
			player.sendMessage("\u00A74Skyblock Settings:")
			player.sendMessage("\u00A74Challenge Mode: \u00A7f"+challengeMode)
			player.sendMessage("\u00A74Game style Mode: \u00A7f"+gameTypes[styleIdx])
			player.sendMessage("\u00A74Sapling Type: \u00A7f"+saplingType)
			player.sendMessage("\u00A74Fertalized Tree Count: \u00A7f"+treeCount)
			player.sendMessage("\u00A74Nether has roof (mobs spawn naturally): \u00A7f"+netherRoof.toString())
			player.sendMessage("\u00A74Approximate Scatter distance (on spawn): \u00A7f"+scatterMax.toString())
			player.sendMessage("\u00A74Random Tick Rate: \u00A7f"+world.gameRules.randomTickSpeed.toString())
			player.sendMessage("\u00A74Natural Regen: \u00A7f"+world.gameRules.naturalRegeneration)
        }
    );
});



// subscriptions
world.afterEvents.worldLoad.subscribe(({ customCommandRegistry  }) => {
	loadRules()
})
function loadRules(){
	if (netherRun){
		system.clearJob(netherRun)
	}
	worldConfigured=world.getDynamicProperty("worldConfigured")
	if (typeof worldConfigured!== "undefined"){//if skyblock settigns are not saved, try and set up the server.
		let sapIndex = world.getDynamicProperty("sapIndex")//Loading settings
		let styleIdx = world.getDynamicProperty("styleIdx")//Loading settings
		let gamestyleIndex = world.getDynamicProperty("gameStyle")
		scatterMax = world.getDynamicProperty("scatterMax")//Loading settings
		netherRoof = world.getDynamicProperty("NetherRoof")//Loading settings
		treeCount = world.getDynamicProperty("treeCount")//Loading settings
		let saplingTypes=Object.keys(saplings)//getting keys for sappling types
		saplingType = saplingTypes[sapIndex]//loading the sappling selected
		challengeMode = challengeModes[styleIdx]//Loading loading challeng mode
		if(netherRoof && freshLoad){
			netherRun = system.runInterval(setNetherRoof,10)
			freshLoad=false
		}
	}
}

// subscriptions
world.afterEvents.playerPlaceBlock.subscribe((event) => {
	if ((event.block.typeId.includes("sapling") ) ){
		let player = event.player
		let playerTreeCount = player.getDynamicProperty("treeCount")
		if (playerTreeCount == null){
			player.setDynamicProperty("treeCount", treeCount)
			playerTreeCount = treeCount;
		}
		if (playerTreeCount>0){
			let treeType = event.block.typeId.split("_")[0]
			treeType = treeType.replace("minecraft:","")
			playerTreeCount-=1
			player.sendMessage(treeType)
			switch(treeType){
				case "dark":
					player.dimension.setBlockType(event.block.location,"minecraft:air")
					player.dimension.placeFeature("minecraft:roofed_tree_feature",event.block.location,true)
					player.sendMessage("\u00A74Trees Remaining: \u00A7f"+playerTreeCount.toString())
					player.setDynamicProperty("treeCount", playerTreeCount)
					break;
				case "acacia":
					player.dimension.setBlockType(event.block.location,"minecraft:air")
					player.dimension.placeFeature("minecraft:savanna_tree_feature",event.block.location,true)
					player.sendMessage("\u00A74Trees Remaining: \u00A7f"+playerTreeCount.toString())
					player.setDynamicProperty("treeCount", playerTreeCount)
					break;
				case "pale":
					player.dimension.setBlockType(event.block.location,"minecraft:air")
					player.dimension.placeFeature("minecraft:pale_oak_tree_feature",event.block.location,true)
					player.sendMessage("\u00A74Trees Remaining: \u00A7f"+playerTreeCount.toString())
					player.setDynamicProperty("treeCount", playerTreeCount)
					break;
				case "spruce":
					player.dimension.setBlockType(event.block.location,"minecraft:air")
					player.dimension.placeFeature("minecraft:pine_tree_feature",event.block.location,true)
					player.sendMessage("\u00A74Trees Remaining: \u00A7f"+playerTreeCount.toString())
					player.setDynamicProperty("treeCount", playerTreeCount)
					break;
				case "cherry":
					player.dimension.setBlockType(event.block.location,"minecraft:air")
					player.dimension.placeFeature("minecraft:random_cherry_tree_feature",event.block.location,true)
					player.sendMessage("\u00A74Trees Remaining: \u00A7f"+playerTreeCount.toString())
					player.setDynamicProperty("treeCount", playerTreeCount)
					break;
				case "mangrove":
					player.dimension.setBlockType(event.block.location,"minecraft:air")
					player.dimension.placeFeature("minecraft:random_mangrove_tree_feature",event.block.location,true)
					player.sendMessage("\u00A74Trees Remaining: \u00A7f"+playerTreeCount.toString())
					player.setDynamicProperty("treeCount", playerTreeCount)
					break;
				case "oak":
					player.dimension.setBlockType(event.block.location,"minecraft:air")
					player.dimension.placeFeature("minecraft:random_oak_tree_from_sapling_feature",event.block.location,true)
					player.sendMessage("\u00A74Trees Remaining: \u00A7f"+playerTreeCount.toString())
					player.setDynamicProperty("treeCount", playerTreeCount)
					break;
				case "birch":
					player.dimension.setBlockType(event.block.location,"minecraft:air")
					player.dimension.placeFeature("minecraft:birch_tree_feature",event.block.location,true)
					player.sendMessage("\u00A74Trees Remaining: \u00A7f"+playerTreeCount.toString())
					player.setDynamicProperty("treeCount", playerTreeCount)
					break;
				case "jungle":
					player.dimension.setBlockType(event.block.location,"minecraft:air")
					player.dimension.placeFeature("minecraft:jungle_tree_feature",event.block.location,true)
					player.sendMessage("\u00A74Trees Remaining: \u00A7f"+playerTreeCount.toString())
					player.setDynamicProperty("treeCount", playerTreeCount)
					break;
			}
		}
		
	}
})




world.afterEvents.entityDie.subscribe((event) => {//handles on death 
	if(event.deadEntity.typeId == "minecraft:player"){
		event.deadEntity.addTag("respawn")//Setup to give items on respawn and know that this is a death
		switch(getGamemode()){
			case "Island Per User":
			case "Island on Death":
			case "Pillowcore":
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
						player.runCommand(`fill ${checkchunk.x-16} ${checkchunk.y} ${checkchunk.z-16} ${checkchunk.x+16} ${checkchunk.y} ${checkchunk.z+16} barrier`)
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
					player.runCommand("give @s ice")// give ice
					player.runCommand("give @s lava_bucket")// give lava
					giveSappling(player)//give a sapling
				}
				break;
			case "Nether Start"://if you are starting in the nether, different saplings are given
				spawnInNether(player)
				if ([true,false].sample()){
					player.runCommand("give @s warped_fungus 2")//warped fungus
					player.runCommand("give @s warped_nylium 4")//giving 4 nylium to support growing more nylium if the first dies
					player.runCommand("give @s bone_meal 10")// i estimate you need like 2 to get it to grow but you will need a bunch of you land on the wrong island
				}
				else{
					player.runCommand("give @s crimson_fungus 2")//give crimson
					player.runCommand("give @s crimson_nylium 4")//giving 4 nylium to support growing more nylium if the first dies and getting more saps
					player.runCommand("give @s bone_meal 10")// i estimate you need like 2 to get it to grow
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
	player.setDynamicProperty("treeCount", treeCount)
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
	player.runCommand("give @s "+item)
	player.runCommand("give @s dirt 4")
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
	player.runCommand("tp @s ~ 319 ~")
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
	setupForm.dropdown("Game Style",gameTypes,{defaultValueIndex:0})
	setupForm.dropdown("Sapling",Object.keys(saplings),{defaultValueIndex:0})
	setupForm.dropdown("Challenge Mode",challengeModes,{defaultValueIndex:0})
	setupForm.textField("Fertalized Sapling Count: ","10",{defaultValue:"10"})
	setupForm.textField("Scatter Max", "3000",{defaultValue:"3000"})// done
	setupForm.textField("Random Tick Speed", "1",{defaultValue:"1"})// done
	setupForm.toggle("Nether Roof (allows Natural Ghasts)")
	setupForm.show(moderator).then((response)=> {
		if (response.canceled) {
			system.runTimeout(showSetupMenu,1)
			return;
		}
		let gameStyle = response.formValues[0]
		let sapIndex = response.formValues[1]
		let styleIdx = response.formValues[2]
		treeCount = response.formValues[3]
		scatterMax = response.formValues[4]
		let randomTick = response.formValues[5]
		let netherRoof = response.formValues[6]
		let players = world.getPlayers()
		moderator.runCommand("gamerule sendcommandfeedback false")
		switch(challengeModes[gameStyle]){
			case "No Regen":
				moderator.runCommand("gamerule naturalregeneration false")
				break;
			default:
				moderator.runCommand("gamerule naturalregeneration true")
				break;
		}
		if(isNumeric(randomTick)){
			moderator.runCommand("gamerule randomtickSpeed "+ randomTick.toString())
		}
		if(isNumeric(treeCount)){
			treeCount=parseInt(treeCount);
		}
		if(isNumeric(treeCount)){
			treeCount=parseInt(treeCount);
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
		world.setDynamicProperty("treeCount", treeCount)
		if(netherRoof){
			system.runInterval(setNetherRoof,10)
		}
		
		system.clearRun(uiLoop)
		if (spawnLocation){
			moderator.runCommand(`setblock ${spawnLocation.x} 319 ${spawnLocation.z} air`)
		}
		worldConfigured=world.setDynamicProperty("worldConfigured",true)
		respawnPlayer(moderator)
		loadRules()
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
	target.runCommand('tellraw @s {"rawtext":[{"text":"'+text+'"}]}')
}
function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}
