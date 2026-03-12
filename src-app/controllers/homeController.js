const axios = require('axios')
const userController = require('./userController')

async function renderGet(req, res) {
    try {
        console.log('check if user is logged in')
        if (req.session.username) {
            console.log('user logged in, redirecting to feed');
            host_ip = req.get('host').split(':')[0];
console.log('http://' + JSON.stringify(host_ip) + ':' + req.socket.localPort + '/feed');
            try {
                await axios.request({
                    method: 'get',
                    url: 'http://' + host_ip + ':' + req.socket.localPort + '/feed',
                    maxContentLength: 5000,
                    timeout: 2000,
                    // httpAgent: new httpAgent({keepAlive: true}),
                })
            } catch {
                console.error("Error redirecting with axios");
                console.error("Manually redirecting to feed");
                return res.redirect('feed');
            }
        }
        return userController.showLogin(req, res)
    } catch (err) {
        console.log(err);
        return res.status(500).json(err);
    }
}

module.exports = { renderGet }

