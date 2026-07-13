/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1512408581")

  // remove field
  collection.fields.removeById("text1204587666")

  // add field
  collection.fields.addAt(1, new Field({
    "help": "",
    "hidden": false,
    "id": "select1204587666",
    "maxSelect": 1,
    "name": "action",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "create",
      "update",
      "delete"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1512408581")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text1204587666",
    "max": 50,
    "min": 0,
    "name": "action",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("select1204587666")

  return app.save(collection)
})
