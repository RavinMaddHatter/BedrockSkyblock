import json
import json5
import uuid
from os import path
import const

workingPack=const.workingPack

#pack name
f_name=path.join(workingPack,'Manifest.json')

with open(f_name,"r+") as file:
    data=json5.load(file)

    print('header old: '+data["header"]["uuid"])
    data["header"]["uuid"]=str(uuid.uuid4())
    print('header new: '+data["header"]["uuid"])

    print('module_0 old: '+data["modules"][0]["uuid"])
    data["modules"][0]["uuid"]=str(uuid.uuid4())
    print('module_0 new: '+data["modules"][0]["uuid"])

    if len(data["modules"]) == 2:
        print('module_1 old: '+data["modules"][1]["uuid"])
        data["modules"][1]["uuid"]=str(uuid.uuid4())
        print('module_1 new: '+data["modules"][1]["uuid"])

with open(f_name,"w+") as file:
    json.dump(data,file,indent=2)
print('done')