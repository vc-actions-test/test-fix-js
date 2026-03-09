const dbconnector = require('../utils/dbconnector.js');

class ListenCommand {

	constructor(username) {
        console.log("Listen command");
        this.username = username;
    }

    async execute(blabberUsername) {
        let sqlQuery = "INSERT INTO listeners (blabber, listener, status) values (?, ?, 'Active');";
		console.log(sqlQuery);
		try {
			await dbconnector.query(sqlQuery, [blabberUsername, this.username])

sqlQuery = "SELECT blab_name FROM users WHERE username = ?";
console.log(sqlQuery);
let result = await dbconnector.query(sqlQuery, [blabberUsername]);
			if (result.length > 0 )        
            {
                /* START EXAMPLE VULNERABILITY */
			    let event = this.username + " started listening to " + blabberUsername + " (" + result[0].blab_name + ")";
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
module.exports = ListenCommand;