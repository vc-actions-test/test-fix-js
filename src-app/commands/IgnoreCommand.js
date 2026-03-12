const dbconnector = require('../utils/dbconnector.js');

class IgnoreCommand{
	constructor(username) {
        console.log("Ignore command");
        this.username = username;
    }

    async execute(blabberUsername) 
    { 
        let sqlQuery = "DELETE FROM listeners WHERE blabber=? AND listener=?;";
		console.log(sqlQuery);
		let action;
		try {
			await dbconnector.query(sqlQuery, [blabberUsername, this.username])

			sqlQuery = "SELECT blab_name FROM users WHERE username = '" + blabberUsername + "'";
const escapedQuery = JSON.stringify(sqlQuery);
console.log(escapedQuery);
			let result = await dbconnector.query(sqlQuery);
			if (result.length > 0 )        
            {
                /* START EXAMPLE VULNERABILITY */
			    let event = this.username + " is now ignoring " + blabberUsername + " (" + result[0].blab_name + ")";
sqlQuery = "INSERT INTO users_history (blabber, event) VALUES (?, ?)";
console.log(sqlQuery);
await dbconnector.query(sqlQuery, [this.username, event]);
                /* END EXAMPLE VULNERABILITY */
            }	
			
		} catch (err) {
			console.error(err);
		}
    }
}
module.exports = IgnoreCommand;