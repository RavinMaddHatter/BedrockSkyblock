import json
from os import path
from os import remove
from glob import glob
import const

islandProbability=1.0#percent out of 100
workingPack=const.workingPack

remove(path.join(workingPack,"feature_rules","isl","1_o-n_dummy_placement.json"))
print("dummy removed")

def adjustProb(fileName):
    scatter_chance = f"{islandProbability:.2f}"
    with open(fileName) as file:
        data = json.load(file)
    data["minecraft:feature_rules"]["distribution"]["scatter_chance"]=scatter_chance
    with open(fileName,"w+") as file:
        json.dump(data,file,indent=2)
for file in glob(path.join(workingPack,"feature_rules","isl","*.json")):
    print(path.basename(file))
    adjustProb(file)
