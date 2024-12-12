import json
import const
import uuid
from os import path
import os 
from zipfile import ZIP_DEFLATED, ZipFile
from shutil import copyfile
import shutil
workingPack=const.workingPack
version = "1.21.51+"
packName = f"Skyblock {version}"


shutil.copytree(workingPack, packName)

with open(path.join(packName,"Manifest.json")) as file:
    data=json.load(file)
data["header"]["uuid"]=str(uuid.uuid4())

with open(path.join(packName,"Manifest.json"),"w+") as file:
    json.dump(data,file,indent=2)

shutil.make_archive(packName, 'zip', packName)

os.rename(f'{packName}.zip',f"{packName}.mcpack")

shutil.rmtree(packName)
