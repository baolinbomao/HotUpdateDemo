require = function n(i, r, c) {
function l(s, e) {
if (!r[s]) {
if (!i[s]) {
var t = "function" == typeof require && require;
if (!e && t) return t(s, !0);
if (g) return g(s, !0);
var o = new Error("Cannot find module '" + s + "'");
throw o.code = "MODULE_NOT_FOUND", o;
}
var a = r[s] = {
exports: {}
};
i[s][0].call(a.exports, function(e) {
var t = i[s][1][e];
return l(t || e);
}, a, a.exports, n, i, r, c);
}
return r[s].exports;
}
for (var g = "function" == typeof require && require, e = 0; e < c.length; e++) l(c[e]);
return l;
}({
HotUpdate: [ function(e, t, s) {
"use strict";
cc._RF.push(t, "e1b90/rohdEk4SdmmEZANaD", "HotUpdate");
Object.defineProperty(s, "__esModule", {
value: !0
});
var o = cc._decorator, a = o.ccclass, n = (o.property, function(t) {
__extends(e, t);
function e() {
var e = null !== t && t.apply(this, arguments) || this;
e._storagePath = "";
e.custom_Manifest_Path = "";
e.isUpdating = !1;
return e;
}
e.prototype.onLoad = function() {
this.createAM();
this.initManifest();
};
e.prototype.createAM = function() {
if (cc.sys.isNative) {
this._storagePath = (jsb.fileUtils ? jsb.fileUtils.getWritablePath() : "/") + "hotUpdate/";
if (jsb.fileUtils.isDirectoryExist(this._storagePath)) cc.log("storage path for remote asset: " + this._storagePath); else {
console.log(this._storagePath + " directory doesn't exist");
jsb.fileUtils.createDirectory(this._storagePath);
console.log("this._storagePath:", this._storagePath);
}
this._am = new jsb.AssetsManager("", this._storagePath, function(e, t) {
console.log("version A is " + e + ", version B is " + t);
for (var s = e.split("."), o = t.split("."), a = 0; a < s.length; a += 1) {
var n = parseInt(s[a]), i = parseInt(o[a] || 0);
if (n !== i) return n - i;
}
return o.length > s.length ? -1 : 0;
});
cc.sys.ENABLE_GC_FOR_NATIVE_OBJECTS || this._am.retain();
this._am.setVerifyCallback(function(e, t) {
var s = t.compressed, o = t.md5, a = t.path;
t.size;
if (s) {
console.log("Verification passed : " + a);
return !0;
}
console.log("Verification passed : " + a + " (" + o + ")");
return !0;
});
console.log("Hot update is ready, please check or directly update.");
if (cc.sys.os === cc.sys.OS_ANDROID) {
this._am.setMaxConcurrentTask(10);
console.log("Max concurrent tasks count have been limited to 10");
}
}
};
e.prototype.initManifest = function() {
this.custom_Manifest_Path || (this.custom_Manifest_Path = "res/raw-assets/resources/project.manifest");
if (jsb.fileUtils.isDirectoryExist(this._storagePath)) {
console.log("project.manifest存在，直接从文件读取");
console.log("this._storagePath:", this.custom_Manifest_Path);
var e = jsb.fileUtils.getStringFromFile(this.custom_Manifest_Path);
console.log("json:", e);
var t = JSON.parse(e);
this.initJson(t);
jsb.fileUtils.writeStringToFile(JSON.stringify(t), this.custom_Manifest_Path);
}
cc.loader.loadRes("project", this.loadManifest.bind(this));
};
e.prototype.initJson = function(e) {
console.log("原始packageUrl=" + e.packageUrl);
console.log("原始remoteManifestUrl=" + e.remoteManifestUrl);
console.log("原始remoteVersionUrl=" + e.remoteVersionUrl);
console.log("原始version=" + e.version);
cc.log("修改packageUrl=");
e.packageUrl = "http://172.16.0.37:8000/";
cc.log("修改remoteManifestUrl=");
e.remoteManifestUrl = "http://172.16.0.37:8000/project.manifest";
cc.log("修改remoteVersionUrl=");
e.remoteVersionUrl = "http://172.16.0.37:8000/version.manifest";
cc.log("远程的version=");
};
e.prototype.loadManifest = function(e, t) {
if (e) console.log("error:", e); else if (0 < t.length) {
var s = JSON.parse(t);
this.initJson(s);
t = JSON.stringify(s);
var o = new jsb.Manifest(t, this._storagePath);
this._am.loadLocalManifest(o, this._storagePath);
this.checkUpdate();
}
};
e.prototype.checkUpdate = function() {
if (this.isUpdating) console.log("正在更新或者正在检查更新！"); else {
if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
console.log("重新加载local manifest!");
this.initManifest();
}
if (this._am.getLocalManifest() && this._am.getLocalManifest().isLoaded()) {
this.isUpdating = !0;
this._checkListener = new jsb.EventListenerAssetsManager(this._am, this.checkCB.bind(this));
cc.eventManager.addListener(this._checkListener, 1);
this._am.checkUpdate();
} else console.log("加载local manifest失败!");
}
};
e.prototype.checkCB = function(e) {
console.log("checkCBCode: " + e.getEventCode());
console.log("返回一个code");
var t = !1, s = !1;
switch (e.getEventCode()) {
case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
console.log("local Manifest未发现, 更新停止.");
break;

case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
console.log("下载Manifest失败, 更新停止.");
t = !0;
break;

case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
console.log("解析Manifest失败, 更新停止.");
t = !0;
break;

case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
console.log("当前版本已是最新, 更新停止.");
break;

case jsb.EventAssetsManager.NEW_VERSION_FOUND:
console.log("发现新版本，请开始更新.");
s = !0;
break;

default:
console.log("code返回了,但是都没有实现！");
return;
}
if (t) this.retryCheck(); else {
cc.eventManager.removeListener(this._checkListener);
this._checkListener = null;
this.isUpdating = !1;
if (s) {
console.log("开始更新");
this.hotUpdate();
} else console.log("直接开始游戏");
}
};
e.prototype.retryCheck = function() {
this._am.checkUpdate();
};
e.prototype.hotUpdate = function() {
if (this._am && !this.isUpdating) {
this._updateListener = new jsb.EventListenerAssetsManager(this._am, this.updateCB.bind(this));
cc.eventManager.addListener(this._updateListener, 1);
}
this.isUpdating = !0;
this._am.update();
};
e.prototype.updateCB = function(e) {
console.log("updateCBCode: " + e.getEventCode());
var t = !1, s = !1, o = !1, a = !1;
switch (e.getEventCode()) {
case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
console.log("ERROR_NO_LOCAL_MANIFEST: " + e.getMessage());
console.log("local Manifest未发现, 更新停止.");
a = !0;
break;

case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
console.log("ERROR_DOWNLOAD_MANIFEST: " + e.getMessage());
console.log("下载Manifest失败, 更新停止.");
s = !0;
break;

case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
console.log("ERROR_PARSE_MANIFEST: " + e.getMessage());
console.log("解析Manifest失败, 更新停止.");
s = !0;
break;

case jsb.EventAssetsManager.UPDATE_FAILED:
console.log("UPDATE_FAILED: " + e.getMessage());
console.log("下载或者解压过程中有失败的资源，更新失败");
break;

case jsb.EventAssetsManager.ERROR_UPDATING:
console.log("Asset update error: " + e.getAssetId() + ", " + e.getMessage());
console.log("下载文件失败");
t = !0;
break;

case jsb.EventAssetsManager.ERROR_DECOMPRESS:
console.log("ERROR_DECOMPRESS" + e.getMessage());
console.log("解压文件失败");
break;

case jsb.EventAssetsManager.ASSET_UPDATED:
console.log("ASSET_UPDATED: " + e.getAssetId() + ", " + e.getMessage());
console.log("所有文件下载成功");
break;

case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
cc.log("当前版本已是最新, 更新停止.");
a = !0;
break;

case jsb.EventAssetsManager.UPDATE_PROGRESSION:
var n = e.getPercent();
1 < n && (n = 1);
console.log("正在加载..." + Math.floor(100 * n) + "%");
var i = e.getMessage();
i && console.log("更新文件：" + i);
break;

case jsb.EventAssetsManager.UPDATE_FINISHED:
console.log("Update finished. " + e.getMessage());
o = !0;
}
this.isUpdating = !1;
if (a) {
cc.eventManager.removeListener(this._updateListener);
this._updateListener = null;
console.log("直接开始游戏");
} else if (s) this._am.update(); else if (t) this.retryUpdate(); else if (o) {
cc.eventManager.removeListener(this._updateListener);
this._updateListener = null;
var r = jsb.fileUtils.getSearchPaths(), c = this._am.getLocalManifest().getSearchPaths();
console.log("newPaths:" + JSON.stringify(c));
Array.prototype.unshift(r, c);
cc.sys.localStorage.setItem("HotUpdateSearchPaths", JSON.stringify(r));
jsb.fileUtils.setSearchPaths(r);
cc.audioEngine.stopAll();
cc.game.restart();
}
};
e.prototype.retryUpdate = function() {
console.log("重新下载失败的文件");
this._am.downloadFailedAssets();
};
e.prototype.onDestroy = function() {
if (this._checkListener) {
cc.eventManager.removeListener(this._checkListener);
this._checkListener = null;
}
if (this._updateListener) {
cc.eventManager.removeListener(this._updateListener);
this._updateListener = null;
}
this._am && !cc.sys.ENABLE_GC_FOR_NATIVE_OBJECTS && this._am.release();
};
return e = __decorate([ a ], e);
}(cc.Component));
s.HotUpdate = n;
cc._RF.pop();
}, {} ]
}, {}, [ "HotUpdate" ]);