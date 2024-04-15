const { pusherServer } = require("../services/pusherServer");

exports.authenticatePusher = async (req, res, next) => {
  try {
    const socketId = req.body.socket_id;
    const channel = req.body.channel_name;
    const authResponse = pusherServer.authorizeChannel(socketId, channel);

    res.send(authResponse);
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
