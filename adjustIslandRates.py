import jstyleson as json
from os import path
from glob import glob
import const

islandProbability=1.0#percent out of 100
workingPack=const.workingPack

def adjustProb(fileName):
    #scatter_chance = f"{islandProbability:.2f}"
    scatter_chance = "(math.mod((variable.originx/16)*(variable.originz/16),26)==1)?100:0"
    with open(fileName) as file:
        data = json.load(file)
    data["minecraft:feature_rules"]["distribution"]["scatter_chance"]=scatter_chance
    with open(fileName,"w+") as file:
        json.dump(data,file,indent=2)
for file in glob(path.join(workingPack,"feature_rules","isl","*.json")):
    print(path.basename(file))
    adjustProb(file)
