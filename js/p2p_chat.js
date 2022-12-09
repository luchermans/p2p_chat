/* simple WebRTC peer to peer message and video chat
   thanks to peerjs.com
   
   usage:  
    <input id='src_id'><input id='rmt_id'>
    <video id='rmt_stream' autoplay playsinline></video>
    <div id='msg-box'></div>
*/
var p2p = {}
p2p.stream = null;
p2p.peer =null;
p2p.con = null;

p2p.stream_set = function(stream) {
    p2p.stream = stream;
    if (!do_invite())   p2p.users();
}

p2p.users = function() {
    pid = p2p.par_get('p2p_src_id');
    if (pid) {
        gEl('src_id').value = p2p.par_get('p2p_src_id');
    }
    gEl('dst_id').value = p2p.par_get('p2p_dst_id');
    p2p.init();
}

p2p.reload = function() {
    var pid = gEl('src_id').value;
    if (pid)    p2p.par_set('p2p_src_id', pid);
    console.log('reload', pid);
    pid = gEl('dst_id').value;
    if (pid)    p2p.par_set('p2p_dst_id', pid);
    location.reload();
}

p2p.init = function(call_back) {
    var pid = gEl('src_id').value;
    p2p.par_set('p2p_src_id', pid);
    if (pid.length < 1) 
        pid = null;
    console.log('p2p.peer.init', pid);

    p2p.peer =new Peer(pid);
    p2p.callback = call_back;
    p2p.peer.on('open', function(id){
        p2p.status_set('Listening on: ' + id);
        gEl('src_id').value = id;
        console.log('p2p call_back', p2p.callback);
        if (p2p.callback)  p2p.callback();
    });
    p2p.peer.on('disconnected', function () {
        p2p.status_set('Disconnected from peer server');
        p2p.peer = null;
    });
    p2p.peer.on('close', function() {
        p2p.status_set('Connection destroyed. Please ReInit');
        p2p.pcon = p2p.peer = null;
    });
    p2p.peer.on('error', function (err) {
        console.log('p2p.peer.ERROR', err);
        p2p.pcon = p2p.peer = null;
    });
    p2p.peer.on('connection', function(peer_conn) {
        p2p.pcon = peer_conn;
        p2p.status_set('incomming message call: ' + p2p.pcon.peer);
        p2p.join(p2p.pcon);
    });
    p2p.peer.on('call', function(call) {
        p2p.status_set('incomming video call: ' + call.peer);
        call.answer(p2p.stream); // Answer the call with an A/V stream.
        call.on('stream', function(rmt_stream) {
            console.log('show rmt stream', rmt_stream);
            gEl('rmt_stream').srcObject = rmt_stream;
        });
    });
}

p2p.join = function(pcon, call_back) {
    pcon.on('open', function(){
        p2p.status_set('Connected to: ' + pcon.peer);
        if (p2p.peer) p2p.peer.disconnect();  //once we have a connection no need for peer server
        if (call_back)  call_back();
    });
    pcon.on('data', function(data){
        p2p.msg_rx(data);
    });
    pcon.on('close', function () {
        p2p.status_set('Disconnected from: '+ pcon.id);
    });
}

p2p.connect = function(call_back) {
    if (!p2p.peer) {
        p2p.init(call_back);
        return null;
    }
    var pid = gEl('dst_id').value;
    p2p.par_set('p2p_dst_id', pid);
    p2p.status_set('calling: ' + pid);
    if (p2p.pcon)
        p2p.pcon.close();
    p2p.pcon = p2p.peer.connect(pid, {debug:2, reliable:true});
    p2p.join(p2p.pcon, call_back);
    return p2p.pcon;
}

p2p.send = function() {
    if (!p2p.pcon) { p2p.pcon = p2p.connect(p2p.send); return; }
    var msg = gEl('p2p-msg').value;
    gEl('p2p-msg').value = '';
    p2p.msg_tx(msg);
    p2p.pcon.send(msg);
}

p2p.video_connect = function() {
    if (!p2p.peer)  p2p.init();
    var pid = gEl('dst_id').value;
    p2p.par_set('p2p_dst_id', pid);
    p2p.status_set('video_calling: ' + pid);
    var call = p2p.peer.call(pid, p2p.stream);
    console.log('video_called', pid, call);
    call.on('stream', function(rmt_stream) {
        console.log('rmt_stream', rmt_stream);
        gEl('rmt_stream').srcObject = rmt_stream;
        //if (p2p.peer)   p2p.peer.disconnect();  //once we have a connection no need for peer server
    });
}

/* --- other stuff ---*/
p2p.par_set = function(par, val) {
    localStorage.setItem(par, val);
}
p2p.par_get = function(par) {
    return localStorage.getItem(par);
}
p2p.status_set = function(stat) {
    console.log('p2p:' + stat);
    gEl('p2p-status').innerHTML = stat;
}
p2p.msg_rx = function(msg) {msg_add(msg, 'msg-rx')}
p2p.msg_tx = function(msg) {msg_add(msg, 'msg-tx')}

function gEl(id) {return document.getElementById(id); }

function msg_add(msg, cls) {
    gEl('msg-box').innerHTML = "<div class=" + cls + ">" + msg + '</div>' + gEl('msg-box').innerHTML;
}


function invite() { //copy invite URL?from=dst_id&to=src_id to clipboard
    var inv = (location + '#').split('?')[0].split('#')[0];
    inv = inv + '?from=' + gEl('dst_id').value +'&to=' + gEl('src_id').value;
    console.log(inv);
    navigator.clipboard.writeText(inv).then(function() {
        alert('URL copied to clipboard\n'+ inv);
    });
}

function do_invite() {  //get ?from=src_id&to=dst_id
    var pars = ('' + location).split('?from=')[1];
    if (!pars)  return 0;
    pars = pars.split('&to=');
    if (pars[0]) {
        gEl('src_id').value = pars[0];
        p2p.par_set('p2p_src_id', pars[0]);
        if (pars[1]) {
            gEl('dst_id').value = pars[1];
            p2p.init();
            return 1;
        }
    }
    return 0;
}

function stream_init() {
    var media = navigator.mediaDevices || navigator.media || navigator.webkitmedia || navigator.mozmedia;
    console.log('media', media);
    var devs = media.enumerateDevices();
    console.log('media.devices', devs);
    media.getUserMedia({ video: true , audio: true})
    .then(function (stream) {
        p2p.stream = stream;
        console.log('p2p.stream' , stream);
        gEl('local_stream').srcObject = stream
        p2p.stream_set(stream);
    })
    .catch(function (err) {
        console.log('media error', err);
        alert(err);
    });
}
