/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2034940204")

  // add phone field validation
  {
    let field = collection.fields.find((f) => f.name === "phone")
    if (field) {
      field.pattern = "^\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$"
    }
  }

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2034940204")

  // remove phone field validation
  {
    let field = collection.fields.find((f) => f.name === "phone")
    if (field) {
      field.pattern = ""
    }
  }

  return app.save(collection)
})