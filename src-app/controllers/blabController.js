const pyformat = require('pyformat');
const dbconnector = require('../utils/dbconnector.js');
var Blab = require('../models/Blab');
var Blabber = require('../models/Blabber');
var Comment = require('../models/Comment');
const moment = require('moment')
const autoInject = require('async/autoInject.js');
const IgnoreCommand = require('../commands/IgnoreCommand');
const ListenCommand = require('../commands/ListenCommand');
const docPath = require('doc-path');

const sqlBlabsByMe = "SELECT blabs.content, blabs.timestamp, COUNT(comments.blabber) AS count, blabs.blabid "
        + "FROM blabs LEFT JOIN comments ON blabs.blabid = comments.blabid "
        + "WHERE blabs.blabber = ? GROUP BY blabs.blabid ORDER BY blabs.timestamp DESC;";

const sqlBlabsForMe = "SELECT users.username, users.blab_name, blabs.content, blabs.timestamp, COUNT(comments.blabber) AS count, blabs.blabid "
        + "FROM blabs INNER JOIN users ON blabs.blabber = users.username INNER JOIN listeners ON blabs.blabber = listeners.blabber "
        + "LEFT JOIN comments ON blabs.blabid = comments.blabid WHERE listeners.listener = ? "
        + "GROUP BY blabs.blabid ORDER BY blabs.timestamp DESC LIMIT {} OFFSET {};";

async function showFeed(req, res){
    
    console.log("Entering showFeed");

    let username = req.session.username;
    // Ensure user is logged in
    if (!username) 
    {
        console.log("User is not Logged In - redirecting...");
        return res.redirect("login?target=feed");
    }

console.log("User is Logged In - continuing... UA=", JSON.stringify(req.headers['user-agent']), " U=", username);
    
    try {
        console.log("Getting Database connection");

        // Find the Blabs that this user listens to
        console.log("Executing the BlabsForMe Prepared Statement");
        let blabsForMeResults = await dbconnector.query(pyformat(sqlBlabsForMe, [10, 0]), [username]);

        // Store them in the Model
        feedBlabs = [];
        let author;
        let post;
        for (item of blabsForMeResults) {
            author = new Blabber();
            author.setUsername(item['username']);
            author.setBlabName(item['blab_name']);

            post = new Blab();
            post.setId(item['blabid']);
            post.setContent(item['content']);
            post.setPostDate(item['timestamp']);
            post.setCommentCount(item['count']);
            post.setAuthor(author);

            feedBlabs.push(post);
        }
        res.locals['blabsByOthers'] = feedBlabs;
        res.locals['currentUser'] = username;

        // Find the Blabs by this user
        console.log("Executing the BlabsByMe Prepared Statement");
        let blabsByMeResults = await dbconnector.query(sqlBlabsByMe, [username])

        // Store them in the model
        myBlabs = [];
        for (item of blabsByMeResults) {
            post = new Blab();
            post.setId(item['blabid']);
            post.setContent(item['content']);
            post.setPostDate(item['timestamp']);
            post.setCommentCount(item['count']);

            myBlabs.push(post);
        }
        res.locals['blabsByMe'] = myBlabs;
    } catch (err) {
        console.error("Error connecting to database and querying data: ", err);
    }
    return res.render('feed',{});
}
async function getMoreFeed(req,res){
    const count = req.query.count;
    const length = req.query.len;
    const template = "<li><div>" + "\t<div class=\"commenterImage\">" + "\t\t<img src=\"/images/{username}.png\">"
				+ "\t</div>" + "\t<div class=\"commentText\">" + "\t\t<p>{content}</p>"
				+ "\t\t<span class=\"date sub-text\">by {blab_name} on {timestamp}</span><br>"
				+ "\t\t<span class=\"date sub-text\"><a href=\"blab?blabid={blabid}\">{count} Comments</a></span>" + "\t</div>"
				+ "</div></li>";

    let cnt = null;
    let len = null;
                
    try {
        // Convert input to integers
        cnt = Number(count);
        len = Number(length);
    } catch (err) {
        console.error(err);
        return ""
    }
    username = req.session.username;

    // Get the Database Connection
    let ret = [];
    try {
        console.log("Executing prepared statement");
        let results = await dbconnector.query(pyformat(sqlBlabsForMe, [len,cnt]), [username])

        let blab;
        for (item of results)
        {
            blab = new Blab();
            blab.setPostDate(item['timestamp']);
            formatter = {
                username: item['username'],
                blab_name: item['blab_name'],
                content: item['content'],
                timestamp: blab.getPostDateString(),
                blabid: item['blabid'],
                count: item['count']
            }
            ret += pyformat(template,[],formatter)
        }        
    } catch (ex) {
        console.error(ex);
    }
    return res.send(ret)

}
async function processFeed(req, res){
    let blab = req.body['blab']
    let nextView = "feed";
    console.log("Entering processFeed");

    let username = req.session.username;
    // Ensure user is logged in
    if (username == null) {
        console.log("User is not Logged In - redirecting...");
        return res.redirect("login?target=feed");
    }
console.log("User is Logged In - continuing... UA=" + JSON.stringify(req.headers["User-Agent"]) + " U=" + username);

    let addBlabSql = "INSERT INTO blabs (blabber, content, timestamp) values (?, ?, ?);";

    try {
        console.log("Getting Database connection");
        
        let now = new Date();
        console.log("Executing the addBlab Prepared Statement");
        let addBlabResult = await dbconnector.query(addBlabSql, [username, blab, now]);

        // If there is a record...
        if (addBlabResult) {
            // failure
            res.locals['error'] = "Failed to add blab";
        }
        nextView = "feed";
    } catch (ex) {
        console.error(ex);
    }

    return res.redirect(nextView);
}

async function showBlab(req,res)
{
    let blabid = req.query.blabid;
    let nextView = 'res.redirect("feed");';
	console.log("Entering showBlab");

	let username = req.session.username;
    // Ensure user is logged in
    if (username == null) {
        console.log("User is not Logged In - redirecting...");
        return res.redirect("login?target=feed");
    }

console.log("User is Logged In - continuing... UA=" + JSON.stringify(req.headers["User-Agent"]) + " U=" + username);

    const blabDetailsSql = "SELECT blabs.content, users.blab_name "
            + "FROM blabs INNER JOIN users ON blabs.blabber = users.username " + "WHERE blabs.blabid = ?;";

    const blabCommentsSql = "SELECT users.username, users.blab_name, comments.content, comments.timestamp "
            + "FROM comments INNER JOIN users ON comments.blabber = users.username "
            + "WHERE comments.blabid = ? ORDER BY comments.timestamp DESC;";

    try {

        // Find the Blabs that this user listens to
        console.log("Executing the blabDetails Prepared Statement");
        let blabDetailsResults = await dbconnector.query(blabDetailsSql, [blabid]);

        // If there is a record...
        let blabCommentsResults;
        let comments;
        let author;
        let comment;
        for (item of blabDetailsResults) {
            // Get the blab contents
            res.locals['content'] = item['content'];
            res.locals['blab_name'] = item['blab_name'];
            res.locals['blabid'] = blabid;
            // Now lets get the comments...
            console.log("Preparing the blabComments Prepared Statement");
            console.log("Executing the blabComments Prepared Statement");
            blabCommentsResults = await dbconnector.query(blabCommentsSql, [blabid])

            // Store them in the model
            comments = [];
            for (item of blabCommentsResults) {
                author = new Blabber();
                author.setUsername(item['username']);
                author.setBlabName(item['blab_name']);

                comment = new Comment();
                comment.setContent(item['content']);
                comment.setTimestamp(item['timestamp']);
                comment.setAuthor(author);

                comments.push(comment);
            }
            res.locals['comments'] = comments

            nextView = 'res.render("blab");';
        }

    } catch (ex) {
        console.error(ex);
    }

    return eval(nextView);
}

async function processBlab(req,res)
{
    const comment = req.body.comment;
    const blabid = req.body.blabid;
    nextView = 'res.redirect("feed");';
    console.log("Entering processBlab");

    username = req.session.username;
    // Ensure user is logged in
    if (username == null) {
        console.log("User is not Logged In - redirecting...");
        return res.redirect("login?target=feed");
    }

console.log("User is Logged In - continuing... UA=" + JSON.stringify(req.headers["User-Agent"]) + " U=" + username);
    let addCommentSql = "INSERT INTO comments (blabid, blabber, content, timestamp) values (?, ?, ?, ?);";

    try {
        let timestamp;
        console.log('Beginning AutoInject');
        await autoInject({
            first_function: async function(){
                console.log("Getting Database connection");
            },
            second_function: async function(){
                console.log("Preparing the addComment Prepared Statement");
                timestamp = moment().format('YYYY-MM-DD HH:mm:ss')
            },
          }, function(err, result){
            if (err){
              // Displays error
              console.log('Autoinject error: ' + err);
            }
          })

        console.log("Executing the addComment Prepared Statement");
        let addCommentResult = await dbconnector.query(addCommentSql, [blabid,username,comment,timestamp])
        // If there is a record...
        if (addCommentResult) {
            // failure
            res.locals["error"] = "Failed to add comment";
        }

        nextView = 'res.redirect("blab?blabid=' + blabid + '");';
    } catch (ex) {
        console.error(ex);
    }

    return eval(nextView);
    
}

async function showBlabbers(req,res){
    
    let sort = req.query.sort;
    
    if (sort == null || sort == "") {
        sort = "blab_name ASC";
    }

    let nextView = 'res.redirect("feed");';
    console.log("Entering showBlabbers");

    const username = req.session.username;
    // Ensure user is logged in
    if (username == null) {
        console.log("User is not Logged In - redirecting...");
        return res.redirect("login?target=blabbers");
    }

const escapedUserAgent = JSON.stringify(req.headers["User-Agent"]);
const escapedUsername = JSON.stringify(username);
console.log("User is Logged In - continuing... UA=" + escapedUserAgent + " U=" + escapedUsername);

    /* START EXAMPLE VULNERABILITY */
    const blabbersSql = "SELECT users.username," + " users.blab_name," + " users.created_at,"
            + " SUM(if(listeners.listener=?, 1, 0)) as listeners,"
            + " SUM(if(listeners.status='Active',1,0)) as listening"
            + " FROM users LEFT JOIN listeners ON users.username = listeners.blabber"
            + " WHERE users.username NOT IN (\"admin\",\"admin-totp\",?)" + " GROUP BY users.username" + " ORDER BY " + sort + ";";

    try {
        console.log("Getting Database connection");
        // Find the Blabbers
console.log(JSON.stringify(blabbersSql));
        let blabbersResults = await dbconnector.query(blabbersSql, [username, username])
        /* END EXAMPLE VULNERABILITY */

        let blabbers = [];
        let blabber;
        for (result of blabbersResults) {
            blabber = new Blabber();
            blabber.setBlabName(result['blab_name']);
            // blabber.setUsername(result['username']);
            docPath.setPath(blabber, 'username', result['username']);
            blabber.setCreatedDate(result['created_at']);
            blabber.setNumberListeners(result['listeners']);
            blabber.setNumberListening(result['listening']);

            blabbers.push(blabber);
        }
        res.locals["blabbers"] = blabbers;

        nextView = 'res.render("blabbers");';

    } catch (err) {
        console.error(err);
    }

    return eval(nextView);
}

async function processBlabbers(req,res){
    const blabberUsername = req.body.blabberUsername;
    const command = req.body.command;
    let nextView = 'res.redirect("feed");';
    console.log("Entering processBlabbers");

    const username = req.session.username;
    // Ensure user is logged in
    if (username == null) {
        console.log("User is not Logged In - redirecting...");
        return res.redirect("login?target=blabbers");
    }

console.log("User is Logged In - continuing... UA=" + JSON.stringify(req.headers["User-Agent"]) + " U=" + JSON.stringify(username));

    if (command == null) {
        console.log("Empty command provided...");
        return nextView = res.redirect("login?target=blabbers");
    }

console.log("blabberUsername = " + JSON.stringify(blabberUsername));
const escapedCommand = JSON.stringify(command);
console.log("command = " + escapedCommand);

    try {
        /* START EXAMPLE VULNERABILITY */
        let module = String(ucfirst(command)) + "Command";
        const cmdClass = eval(module);
        let cmdObj = new cmdClass(username);
        await cmdObj.execute(blabberUsername);
        /* END EXAMPLE VULNERABILITY */

        nextView = 'res.redirect("blabbers");';

    } catch (err) {
        console.error(err);
    }
    
    return eval(nextView);
}

function ucfirst(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}


module.exports = {
    showBlabbers,
    processBlabbers,
    showFeed,
    getMoreFeed,
    processFeed,
    showBlab,
    processBlab,
}