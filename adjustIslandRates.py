import jstyleson as json
from os import path
from glob import glob
import const

islandProbability=1.0#percent out of 100
excludedFiles=["1_o-n_dummy_placement.json"]
workingPack=const.workingPack

def adjustProb(fileName):
    scatter_chance = f"(variable.worldx == 0 && variable.worldz == 0) ? 100 : {islandProbability:.2f}"
    with open(fileName) as file:
        data = json.load(file)
    data["minecraft:feature_rules"]["distribution"]["scatter_chance"]=scatter_chance
    with open(fileName,"w+") as file:
        json.dump(data,file,indent=2)
for file in glob(path.join(workingPack,"feature_rules","isl","*.json")):
    print(path.basename(file))
    if path.basename(file) not in excludedFiles:
        adjustProb(file)
