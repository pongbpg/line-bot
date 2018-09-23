// exports.LineBotPush = functions.https.onRequest((req, res) => {
//     const message = 'message';
//     return push(res, message);

// });
// const push = (res, msg) => {
//     return request({
//         method: `POST`,
//         uri: `${LINE_MESSAGING_API}/push`,
//         headers: LINE_HEADER,
//         body: JSON.stringify({
//             to: `zzzzz`,
//             messages: [
//                 {
//                     type: `text`,
//                     text: msg
//                 }
//             ]
//         })
//     }).then(() => {
//         return res.status(200).send(`Done`);
//     }).catch((error) => {
//         return Promise.reject(error);
//     });
// }
// exports.LineBotMulticast = functions.https.onRequest((req, res) => {
//     const text = req.query.text;
//     if (text !== undefined && text.trim() !== ``) {
//         return multicast(res, text);
//     } else {
//         const ret = { message: 'Text not found' };
//         return res.status(400).send(ret);
//     }
// });

// const multicast = (res, msg) => {
//     return request({
//         method: `POST`,
//         uri: `${LINE_MESSAGING_API}/multicast`,
//         headers: LINE_HEADER,
//         body: JSON.stringify({
//             to: [`U3c28a70ed7c5e7ce2.....`, `Ua0e8dd654eeb5679.....`],
//             messages: [
//                 {
//                     type: `text`,
//                     text: msg
//                 }
//             ]
//         })
//     }).then(() => {
//         const ret = { message: 'Done' };
//         return res.status(200).send(ret);
//     }).catch((error) => {
//         const ret = { message: `Sending error: ${error}` };
//         return res.status(500).send(ret);
//     });
// }