const process = require('child_process');
const fortuneRiddle = require('../utils/fortuneData.js');
const { execFileSync } = require('child_process');

// Loads tools page
function showTools(req, res) {
    res.render('tools.hbs', {});
}
// Performs actions on tools page
async function processTools(req, res) {
    console.log("Request body:", req.body); // Log the entire request body
    let host = req.body.host;
    let fortuneFile = req.body.fortuneFile;

    res.locals['ping'] = await ((host != null) ? ping(host).catch(function () { console.log("Promise rejected"); }) : "");

    if (!fortuneFile) {
        fortuneFile = "fortunes";
    }
console.log("Selected fortune file:", JSON.stringify(fortuneFile));
    
    res.locals['fortunes'] = await fortune(fortuneFile).catch(function () { console.log("Promise rejected"); });
    
    return res.render('tools', {host});
}
// Pings selected host based on user input, then outputs the results
async function ping(host) {
    return new Promise((resolve, reject) => {
        let output = "";
console.log("Pinging " + JSON.stringify(host));

        let timer = setTimeout(() => {
            console.log("Ping timed out");
            output = "ping: unknown host " + host;
            reject(output);
        }, 5000);
        try {
const hostWhiteList = ['localhost', '127.0.0.1', '8.8.8.8', 'google.com', 'example.com'];
if (!hostWhiteList.includes(host)) {
    clearTimeout(timer);
    reject("Host not in whitelist");
    return;
}
let pingProcess = child_process.execFile('ping', ['-c', '1', host]);
            pingProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pingProcess.stderr.on('data', (data) => {
                console.log("Error: " + data.toString());
                clearTimeout(timer);
                reject(data.toString());
            });

            pingProcess.on('exit', (code) => {
                console.log("Exit code: " + code);
                clearTimeout(timer);
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(`ping process exited with code ${code}`);
                }
            });
        } catch (err) {
            console.error("Error occured during ping: ", err);
            output = "ping: unknown host " + host;
            resolve(output);
        }
    });
}

// Produces a fortune based on selection
async function fortune(fortuneFile) {
    
    if (fortuneFile === "fortunes") {
console.log(JSON.stringify(fortuneFile))
console.log(fortuneRiddle.FortuneData())
return fortuneRiddle.FortuneData();
    }
    else if (fortuneFile === "riddles") {
console.log(JSON.stringify(fortuneFile))
console.log(fortuneRiddle.RiddleData())
return fortuneRiddle.RiddleData();
    } else {
        return new Promise((resolve, reject) => {
            let cmd = "fortune " + fortuneFile;
            let output=""
            try{
const pathWhiteList = ['fortune'];
var [cmdPath, ...params] = cmd.split(' ');
pathWhiteList.includes(cmdPath) && child_process.execFileSync(cmdPath, params, (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
                      reject(output);
                    }
                    resolve(stdout)
                });
            }
            catch(err)
            {
                console.log(err);
                resolve(output);
            }
        })
    }
}


module.exports = {showTools, processTools,}


