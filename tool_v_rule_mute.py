import json
import json5
from os import path
from glob import glob
import const

workingPack=const.workingPack

iterate_val=0
for f_name in glob(workingPack+'/feature_rules/v_mute/*.json'):
    with open(f_name,"r+") as file:
        #print(f_name)
        data=json5.load(file)
        if "minecraft:feature_rules" in data.keys():
            if "distribution" in data["minecraft:feature_rules"].keys():
                if "iterations" in data["minecraft:feature_rules"]["distribution"].keys():
                    data["minecraft:feature_rules"]["distribution"]["iterations"]=iterate_val
            else:
                print(f"no distribution: {f_name}")
        else:
            print(f"no feature_rules: {f_name}")
    with open(f_name,"w+") as file:
        json.dump(data,file,indent=2)

f_name2=path.join(workingPack,'feature_rules/v_mute/overworld_underwater_cave_carver_feature.json')
key_var2="minecraft:underground_cave_carver_feature"
if path.exists(f_name2):
    with open(f_name2,"r+") as file2:
        data2=json5.load(file2)
        data2["minecraft:feature_rules"]["description"]["places_feature"]=key_var2
    with open(f_name2,"w+") as file2:
        json.dump(data2,file2,indent=2)

f_name3=path.join(workingPack,'feature_rules/v_mute/overworld_amethyst_geode_feature.json')
key_var3a=0.2
key_var3b=1
if path.exists(f_name3):
    with open(f_name3,"r+") as file3:
        data3=json5.load(file3)
        data3["minecraft:feature_rules"]["distribution"]["scatter_chance"]=key_var3a
        data3["minecraft:feature_rules"]["distribution"]["iterations"]=key_var3b
    with open(f_name3,"w+") as file3:
        json.dump(data3,file3,indent=2)

print('done')