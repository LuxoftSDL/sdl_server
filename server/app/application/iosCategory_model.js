// ~> Model
// ~A Scott Smereka


/* ************************************************** *
 * ******************** Load Libraries
 * ************************************************** */
var fox      = require("foxjs"),
		model    = fox.model;

module.exports = function(app, db, config) {

	/* ************************************************** *
	 * ******************** Module Variables
	 * ************************************************** */

	var Schema      = db.Schema,              // Mongoose schema object for MongoDB documents.
			ObjectId    = Schema.ObjectId;        // Object ID used in mongoose schemas


	/* ************************************************** *
	 * ******************** Module Config Schema
	 * ************************************************** */

	/**
	 * Describes a SDL category for applications.
	 */
	var IosCategory = new Schema({
		name:       { type: String, required: true },               // Name of the category, generally this will be displayed to the user.
		queryName:  { type: String }               // Nice name for querying a category.
	});


	/* ************************************************** *
	 * ******************** Application Methods
	 * ************************************************** */

	/* ************************************************** *
	 * ******************** Application Events
	 * ************************************************** */

	IosCategory.pre('save', function(next) {

		if(this.queryName === undefined || this.queryName === null) {
			this.queryName = this.name.toLowerCase().replace(/&/g, "and").replace(/[^\w\s]/gi, '').replace(/\s+/g, '');
		}

		return next();
	});


	/* ************************************************** *
	 * ******************** CRUD Override Methods
	 * ************************************************** */

	/* Enabling CRUD will automatically take care of
	 * update, and delete methods for the object. However
	 * you can still add your own custom functionality
	 * here, by overriding the default methods.
	 *
	 * In addition to overriding you can add more methods
	 * that CRUD will automatically use such as sanitize.
	 */

	/**
	 * Strip out secret information that should not be seen
	 * outside of this server.
	 */
	IosCategory.methods.sanitize = function() {
		return this;
	};

	/* ************************************************** *
	 * ******************** Plugins
	 * ************************************************** */

	// Enable additional functionality through plugins
	// you have written or 3rd party plugins.

	// Add addition fields and methods to this schema to
	// create, read, update, and delete schema objects.
	IosCategory.plugin(model.crudPlugin);

	/* ************************************************** *
	 * ******************** Export Schema(s)
	 * ************************************************** */

	db.model('IosCategory', IosCategory);
};

