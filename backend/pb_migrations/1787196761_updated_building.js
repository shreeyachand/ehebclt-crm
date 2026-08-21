/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2703309261")

  // update city field validation
{
    let field = collection.fields.find((f) => f.name === "city")
    if (field) {
      field.pattern = "^[a-zA-Z\\s]+$"
    }
  }

  // update zip field validation
  {
    let field = collection.fields.find((f) => f.name === "zip")
    if (field) {
      field.min = 5
      field.max = 5
      field.pattern = "^[0-9]{5}$"
    }
  }

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2703309261")

  // remove city field validation
  {
    let field = collection.fields.find((f) => f.name === "city")
    if (field) {
      field.pattern = ""
    }
  }

  // remove zip field validation
  {
    let field = collection.fields.find((f) => f.name === "zip")
    if (field) {
      field.min = 0
      field.max = 0
      field.pattern = ""
    }
  }

  return app.save(collection)
})