import fs from "fs";

export default class Repository {
    constructor(objectsFile) {
        this.objectsList = null;
        this.objectsFile = objectsFile;
        this.read();
    }

    objects() {
        if (this.objectsList == null) this.read();
        return this.objectsList;
    }

    read() {
        try {
            let rawdata = fs.readFileSync(this.objectsFile);
            this.objectsList = JSON.parse(rawdata);
            return true;
        }
        catch (error) {
            console.log(error);
            this.objectsList = [];
        }
        return false;
    }

    write() {
        try {
            fs.writeFileSync(this.objectsFile,

                JSON.stringify(this.objectsList));
            return true;
        }
        catch (error) {
            console.log(error);
        }
        return false;
    }

    nextId() {
        let maxId = 0;
        for (let object of this.objects()) {
            if (object.Id > maxId) {
                maxId = object.Id;
            }
        }
        return maxId + 1;
    }

    add(object) {
        object.Id = this.nextId();
        this.objectsList.push(object);
        if (this.write())
            return object;
        else
            return null;
    }

    update(objectToModify) {
        let index = 0;
        for (let object of this.objects()) {
            if (object.Id === objectToModify.Id) {
                this.objectsList[index] = objectToModify;
                return this.write();
            }
            index++;
        }
        return false;
    }

    remove(id) {
        let index = 0;
        for (let object of this.objects()) {
            if (object.Id === id) {
                this.objectsList.splice(index, 1);
                return this.write();
            }
            index++;
        }
        return false;
    }

    getAll(params = null) {
        return this.objects();
    }
    
    get(id) {
        for (let object of this.objects()) {
            if (object.Id === id)
                return object;
        }
        return null;
    }
}