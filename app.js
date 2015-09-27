'use strict';
var path = require('path'),
    mongoose = require('mongoose'),
    express = require('express'),
    _ = require('lodash')
bodyParser = require('body-parser');

mongoose.Promise = Promise;
var options = {
    // db: { native_parser: true },
    // server: { poolSize: 5 },
    // replset: { rs_name: 'myReplicaSetName' },
    // user: 'myUserName',
    // pass: 'myPassword'
}
mongoose.connect('mongodb://localhost/blog', options);

var blogSchema = mongoose.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: String,
        required: true,
        trim: true
    },
});

/**
 * Index
 */
blogSchema.index({
    title: 1,
    author: 1
});
//When your application starts up, Mongoose automatically calls ensureIndex for each defined index in your schema. Mongoose will call ensureIndex for each index sequentially, and emit an 'index' event on the model when all the ensureIndex calls succeeded or when there was an error. While nice for development, it is recommended this behavior be disabled in production since index creation can cause a significant performance impact. Disable the behavior by setting the autoIndex option of your schema to false, or globally on the connection by setting the option config.autoIndex to flase
blogSchema.set('autoIndex', false);

/**
 * Validations
 */
blogSchema.path('title').validate(function(email) {
    return !!email;
}, 'email cannot be blank');

blogSchema.path('content').validate(function(content) {
    return !!content;
}, 'content cannot be blank');
blogSchema.path('author').validate(function(author) {
    return !!author;
}, 'author cannot be blank');
/**
 * Virtuals
 */
blogSchema.set('toObject', {
    virtuals: true
});
blogSchema.set('toJSON', {
    virtuals: true
});
blogSchema.virtual('date.day').get(function(date) {
    return this.formattedDay();
});
blogSchema.virtual('date.date').get(function(date) {
    return this.formattedDate();
});
blogSchema.virtual('date.fullYear').get(function(date) {
    return this.created.getFullYear();
});
blogSchema.virtual('date.month').get(function(date) {
    return this.created.getMonth();
});
// Post middleware
//  Document middleware is supported for the following document functions:.
// init - validate - save - remove
// Query middleware is supported for the following Model and Query functions.
// count - find - findOne - findOneAndRemove - findOneAndUpdate - update
blogSchema.post('init', function(doc) {
    console.log('%s has been initialized from the db', doc._id);
});
blogSchema.post('validate', function(doc) {
    console.log('%s has been validated (but not saved yet)', doc._id);
});
blogSchema.post('save', function(doc) {
    //console.log('%s has been saved', doc._id);
});
blogSchema.post('remove', function(doc) {
    console.log('%s has been removed', doc._id);
});
blogSchema.post('save', function(next) {
    if (this.isNew) {
        console.log('A new user was created.');
    } else {
        console.log('A user updated is details.');
    }
});

blogSchema.pre('find', function() {
    //console.log(this instanceof mongoose.Query); // true
    this.start = Date.now();
});

blogSchema.post('find', function(result) {
    //console.log(this instanceof mongoose.Query); // true
    // prints returned documents
    console.log('find() returned ' + JSON.stringify(result.length));
    // prints number of milliseconds the query took
    console.log('find() took ' + (Date.now() - this.start) + ' millis');
});


/**
 * Pre-save Parallel
 */
// schema.pre('save', true, function(next, done) {
//   // calling next kicks off the next middleware in parallel
//   next();
//   doAsync(done);
// });

//err handler
// CampaignSchema.post('save',function(err) {
//   console.log('a Error has happened: %s',err) // something went wrong
// });
/**
 * Methods
 */
blogSchema.methods = {
    formattedDay: function() {
        return this.created.getDay()
    },
    formattedDate: function() {
        return this.created.getDate()
    },
    toJSON: function() {
        var obj = this.toObject();
        return obj;
    }
};


var Blog = mongoose.model('Blog', blogSchema),
    app = express();
//configs


app.set('port', process.env.PORT || 3000);
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(require('connect-livereload')());
// View
app.get('/', function(req, res) {
    res.sendFile('public/index.html', {
        root: __dirname
    });
});
// Create
app.post('/blogs', function(req, res) {
    if (!req.body || !req.body.content) {
        return res.sendStatus(400);
    }

    var blog = new Blog({
        author: req.body.author,
        content: req.body.content,
        title: req.body.title
    });

    blog.save()
        .then(function() {
            res.status(201)
                .send(blog);
        })
        .catch(function(err) {
            console.error(err);
            res.sendStatus(500);
        });
});

// Retrieve
app.get('/blogs', function(req, res) {
    Blog.find()
        .exec()
        .then(function(blogs) {
            res.json(blogs);
        })
        .catch(function(err) {
            console.error(err);
            res.sendStatus(500);
        });
});

//Read
app.get('/blogs/:id', function(req, res) {
    if (!req.params.id) {
        return res.sendStatus(400);
    }
    Blog.findOne({
            _id: req.params.id
        })
        .exec()
        .then(function(blog) {
            if (!blog) {
                return res.sendStatus(404);
            }
            res.json(blog);
        })
        .catch(function(err) {
            console.error(err);
            res.sendStatus(500);
        });
});

// Update
app.put('/blogs/:id', function(req, res) {
    if (!req.body || !req.body.content || !req.params.id) {
        return res.sendStatus(400);
    }

    Blog.findOneAndUpdate({
            _id: req.params.id
        }, {
            content: req.body.content,
            title: req.body.title,
            author: req.body.author
        })
        .exec()
        .then(function(blog) {
            if (!blog) {
                return res.sendStatus(404);
            }
            res.json(blog);
        })
        .catch(function(err) {
            console.error(err);
            res.sendStatus(500);
        });


});

// Delete
app.delete('/blogs/:id', function(req, res) {
    if (!req.params.id) {
        return res.sendStatus(400);
    }
    Blog.findOneAndRemove({
            _id: req.params.id
        })
        .exec()
        .then(function(blog) {
            if (!blog) {
                return res.sendStatus(404);
            }
            res.sendStatus(200);
        })
        .catch(function(err) {
            console.error(err);
            res.sendStatus(500);
        });
});
app.param('id', function(req, res, next, id) {
    Blog.findById(id)
        .exec()
        .then(function(err, blog) {
            if (err) return next(err);
            if (!blog) return next(new Error('Failed to load Blog:' + id));
            req.blog = blog;
            next();
        });
})

app.listen(app.get('port'), function() {
    console.log("Express server listening on port " + app.get('port'));
});