/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2034940204")

  // add field
  collection.fields.addAt(7, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2703309261",
    "help": "",
    "hidden": false,
    "id": "relation3125260098",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "building_id",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2034940204")

  // remove field
  collection.fields.removeById("relation3125260098")

  return app.save(collection)
})