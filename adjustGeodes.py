import json
from os import path

workingPack = "Packs\Skyblock 3-0"
newProb=0.2

with open(path.join(workingPack,"feature_rules","overworld_amethyst_geode_feature.json")) as file:
    data = json.load(file)
data["minecraft:feature_rules"]["distribution"]["scatter_chance"]=newProb

with open(path.join(workingPack,"feature_rules","overworld_amethyst_geode_feature.json"),"w+") as file:
    json.dump(data,file,indent=2)
