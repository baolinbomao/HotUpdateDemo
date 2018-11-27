/**
 * 热更新文件
 */
const { ccclass, property } = cc._decorator;

@ccclass
export class HotUpdate extends cc.Component {
    //更新主文件夹路径
    private _storagePath: string = '';
    //自定义的manifest
    private custom_Manifest_Path: string = ''
    //jsb的资源管理器实体
    private _am: any;
    // 是否正在检查更新或者正在更新
    private isUpdating: boolean = false;
    // 检查更新的监听 
    private _checkListener: any;
    // 正式更新的监听 
    private _updateListener: any;

    onLoad() {
        this.createAM();
        this.initManifest();
    }

    //创建热更新管理器
    private createAM() {
        //如果不是Native，则不需要热更新
        if (!cc.sys.isNative) {
            return;
        }

        //设置热更新的临时文件夹
        this._storagePath = ((jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + 'hotUpdate/');
        if (!jsb.fileUtils.isDirectoryExist(this._storagePath)) {
            console.log(`${this._storagePath} directory doesn't exist`);
            jsb.fileUtils.createDirectory(this._storagePath);
            console.log('this._storagePath:', this._storagePath)
        } else {
            cc.log(`storage path for remote asset: ${this._storagePath}`);
        }

        //版本比较函数；
        // versionA>versionB代表versionA版本高，
        // versionA<versionB代表versionA版本低，
        // versionA=versionB代表versionA版本相同，
        const versionCompare = (versionA, versionB) => {
            console.log("version A is " + versionA + ', version B is ' + versionB);
            let vA = versionA.split('.');
            let vB = versionB.split('.');

            for (let i = 0; i < vA.length; i += 1) {
                let a = parseInt(vA[i]);
                let b = parseInt(vB[i] || 0);
                if (a === b) {
                    continue;
                }
                else {
                    return a - b;
                }
            }

            if (vB.length > vA.length) {
                return -1;
            }
            else {
                return 0;
            }
        };

        //初始化一个空的manifest url
        this._am = new jsb.AssetsManager('', this._storagePath, versionCompare);

        if (!cc.sys.ENABLE_GC_FOR_NATIVE_OBJECTS) {
            // 由于下载过程是异步的，需要增加_am的索引数以保证它不会被Cocos2d-x的内存管理释放掉
            // 继承于Ref计数器，防止被自动回收
            this._am.retain();
        }

        //设置文件下载完成后的校验
        this._am.setVerifyCallback((path, asset) => {
            // When asset is 压缩, we don't need to check its md5, because zip file have been deleted.
            let compressed = asset.compressed;
            // Retrieve the correct md5 value.
            let correctedMD5 = asset.md5;
            // asset.path is 相对路径 and path is 绝对路径.
            let relativePath = asset.path;
            // The size of asset file, but this value could be 不存在.
            let size = asset.size;
            if (compressed) {
                console.log("Verification passed : " + relativePath);
                return true;
            } else {
                console.log("Verification passed : " + relativePath + ' (' + correctedMD5 + ')');
                return true;
            }
        })

        console.log('Hot update is ready, please check or directly update.');

        if (cc.sys.os === cc.sys.OS_ANDROID) {
            // Some Android device may slow down the download process when concurrent tasks is too much.
            // The value may not be accurate, please do more test and find what's most suitable for your game.
            // 控制下载并发数量
            this._am.setMaxConcurrentTask(10);
            console.log("Max concurrent tasks count have been limited to 10");
        }

        // this.panel.fileProgress.progress = 0;
        // this.panel.byteProgress.progress = 0; 
    }

    // 检查热更新
    private initManifest() {
        //官网写法
        // if(this._am.getState() === jsb.AssetsManager.State.UNINITED) {
        //     let manifest = new jsb.Manifest(this.custom_Manifest_Path, this._storagePath);
        //     this._am.loadLocalManifest(manifest, this._storagePath);
        // }

        //自定义写法 
        //project.manifest是自己定义的，需要自己做
        if(!this.custom_Manifest_Path){
            this.custom_Manifest_Path = 'res/raw-assets/resources/project.manifest';
        }
        //如果有缓存的cache，则动态修改cache的文件内容
        if (jsb.fileUtils.isDirectoryExist(this._storagePath)) {
            console.log("project.manifest存在，直接从文件读取");
            console.log('this._storagePath:', this.custom_Manifest_Path)
            let jsonStr = jsb.fileUtils.getStringFromFile(this.custom_Manifest_Path);
            console.log("json:", jsonStr)
            let json = JSON.parse(jsonStr);
            this.initJson(json)
            jsb.fileUtils.writeStringToFile(JSON.stringify(json), this.custom_Manifest_Path);
        }

        cc.loader.loadRes("project", this.loadManifest.bind(this));
        // this.progress.progress = 0;
        // this.label.string = "正在连接服务器";
    }
 
    //修改project.manifest中的内容
    private initJson(json: any) {
        console.log("原始packageUrl=" + json.packageUrl);
        console.log("原始remoteManifestUrl=" + json.remoteManifestUrl);
        console.log("原始remoteVersionUrl=" + json.remoteVersionUrl);
        console.log("原始version=" + json.version);


        //修改热更新的地址
        cc.log("修改packageUrl=");
        json.packageUrl = 'http://172.16.0.37:8000/';

        cc.log("修改remoteManifestUrl=");
        json.remoteManifestUrl = 'http://172.16.0.37:8000/project.manifest';

        cc.log("修改remoteVersionUrl=");
        json.remoteVersionUrl = 'http://172.16.0.37:8000/version.manifest';

        cc.log("远程的version=");
    }

    //加载manifest
    private loadManifest(error, jsonString) {
        // private loadManifest( jsonString) {
        if (error) {
            console.log('error:', error)
            return;
        }

        if (jsonString.length > 0) {
            //获取上次热更新以后的记录
            const json = JSON.parse(jsonString);
            this.initJson(json);
            jsonString = JSON.stringify(json);
            const manifest = new jsb.Manifest(jsonString, this._storagePath);
            this._am.loadLocalManifest(manifest, this._storagePath);
            this.checkUpdate();
        }
    }

    //检查更新
    private checkUpdate() {
        if(this.isUpdating) {
            console.log('正在更新或者正在检查更新！');
            return;
        }

        // 如果热更新管理器没有初始化，则重新初始化
        if(this._am.getState() === jsb.AssetsManager.State.UNINITED){
            console.log('重新加载local manifest!');
            this.initManifest();
        }

        //检查local manifest加载是否成功
        if(!this._am.getLocalManifest() || !this._am.getLocalManifest().isLoaded()){
            console.log('加载local manifest失败!');
            return;
        }

        this.isUpdating = true;
        //创建并添加更新的监听
        this._checkListener = new jsb.EventListenerAssetsManager(this._am, this.checkCB.bind(this));
        cc.eventManager.addListener(this._checkListener, 1);

        // 启动更新检查
        this._am.checkUpdate();
    }

    //对检查更新的结果进行处理
    private checkCB(event) {
        console.log('checkCBCode: ' + event.getEventCode());
        console.log('返回一个code')
        const code = event.getEventCode();
        //是否需要重新检查更新
        let needRetryCheck: boolean = false;
        //是否需要更新
        let needUpdate: boolean = false;

        switch(code){
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                console.log('local Manifest未发现, 更新停止.');
            break;

            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            console.log('下载Manifest失败, 更新停止.');
                needRetryCheck = true;
            break;

            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
            console.log('解析Manifest失败, 更新停止.');
                needRetryCheck = true;
            break;

            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
            console.log('当前版本已是最新, 更新停止.');
            break;

            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
            console.log('发现新版本，请开始更新.');
                needUpdate = true;
            break;

            // case jsb.EventAssetsManager.ERROR_DECOMPRESS:
            // console.log('code返回了1！');
            // break;
            // case jsb.EventAssetsManager.UPDATE_FAILED:
            // console.log('code返回了2！');
            // break;
            // case jsb.EventAssetsManager.UPDATE_FINISHED:
            // console.log('code返回了3！');
            // break;
            // case jsb.EventAssetsManager.ERROR_UPDATING:
            // console.log('code返回了4！');
            // break;
            // case jsb.EventAssetsManager.ASSET_UPDATED:
            // console.log('code返回了5！');
            // break;
            // case jsb.EventAssetsManager.UPDATE_PROGRESSION:
            //     console.log('code返回了6！');
            // break;

            default:
            console.log('code返回了,但是都没有实现！');
                return;
        }

        //下载或者解析manifest失败，重新检查更新
        if(needRetryCheck) {
            this.retryCheck();
            return;
        }

        //检查完成，移除监听
        cc.eventManager.removeListener(this._checkListener);
        this._checkListener = null;
        this.isUpdating = false;

        //检查是否需要更新，如果不需要则直接开始游戏，否则更新
        if(needUpdate) {
            console.log('开始更新');
            this.hotUpdate();           
        }
        else{
            console.log('直接开始游戏');
            // this.startGame();
        }
    }

    //重新检查更新
    private retryCheck() {
        this._am.checkUpdate();
    }

    // 开始更新
    private hotUpdate() {
        //创建并添加更新的回调
        if(this._am && !this.isUpdating){
            this._updateListener = new jsb.EventListenerAssetsManager(this._am, this.updateCB.bind(this));
            cc.eventManager.addListener(this._updateListener, 1);
        }

        this.isUpdating = true;
        this._am.update();
    }

    //处理更新的回调
    private updateCB(event) {
        console.log('updateCBCode: ' + event.getEventCode());
        // 部分文件下载失败
        let retryUpdate: boolean = false;
        //下载或者解析manifest失败
        let failed: boolean = false;
        //是否重启游戏
        let needRestart: boolean = false;
        //是否直接开始游戏
        let directStart: boolean = false;
        const code = event.getEventCode();
        switch(code) {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
            console.log('ERROR_NO_LOCAL_MANIFEST: ' + event.getMessage());
            console.log('local Manifest未发现, 更新停止.');
                directStart = true;
            break;

            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            console.log('ERROR_DOWNLOAD_MANIFEST: ' + event.getMessage());
            console.log('下载Manifest失败, 更新停止.');
                failed = true;
            break;

            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
            console.log('ERROR_PARSE_MANIFEST: ' + event.getMessage()); 
            console.log('解析Manifest失败, 更新停止.');
                failed = true;
            break;

            case jsb.EventAssetsManager.UPDATE_FAILED:
            console.log('UPDATE_FAILED: ' + event.getMessage());
            console.log('下载或者解压过程中有失败的资源，更新失败')
                break;

            case jsb.EventAssetsManager.ERROR_UPDATING:
            console.log('Asset update error: ' + event.getAssetId() + ', ' + event.getMessage());
            console.log('下载文件失败');
                retryUpdate = true;
                break;

            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
            console.log('ERROR_DECOMPRESS' + event.getMessage());
            console.log('解压文件失败');
                break;

            case jsb.EventAssetsManager.ASSET_UPDATED:
            console.log('ASSET_UPDATED: ' + event.getAssetId() + ', ' + event.getMessage());
            console.log('所有文件下载成功')
                break;

            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                cc.log('当前版本已是最新, 更新停止.');
                directStart = true;
            break;

            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                //官网用法
                // this.panel.byteProgress.progress = event.getPercent();
                // this.panel.fileProgress.progress = event.getPercentByFile();

                // this.panel.fileLabel.string = event.getDownloadedFiles() + ' / ' + event.getTotalFiles();
                // this.panel.byteLabel.string = event.getDownloadedBytes() + ' / ' + event.getTotalBytes();

                // var msg = event.getMessage();
                // if (msg) {
                //     this.panel.info.string = 'Updated file: ' + msg;
                //     cc.log(event.getPercent()/100 + '% : ' + msg);
                // }

                //自定义用法
                let p = event.getPercent();
                if (p > 1) {
                    p = 1;
                }

                console.log(`正在加载...${Math.floor(100 * p)}%`);  
                var msg = event.getMessage();
                if (msg) {
                    console.log('更新文件：' + msg)
                }
                break;

            case jsb.EventAssetsManager.UPDATE_FINISHED:
            console.log('Update finished. ' + event.getMessage());
                needRestart = true;
                break;         
            
            default:
                break;
        }

        this.isUpdating = false;

        //直接开始游戏
        if(directStart) {
            cc.eventManager.removeListener(this._updateListener);
            this._updateListener = null;

            console.log('直接开始游戏');
            // this.startGame();
            return;
        }

        //下载或者解析manifest失败，重新更新
        if(failed) {
            this._am.update();
            return;
        }

        //部分文件下载失败，重新下载
        if(retryUpdate) {
            this.retryUpdate();
            return;
        }

        //更新成功，重启游戏
        if(needRestart) {
            cc.eventManager.removeListener(this._updateListener);
            this._updateListener = null;

            //将热更新的缓存目录添加到搜索路径中，并且前置
            let searchPaths = jsb.fileUtils.getSearchPaths();
            let newPath = this._am.getLocalManifest().getSearchPaths();

            console.log('newPaths:' + JSON.stringify(newPath));
            Array.prototype.unshift(searchPaths, newPath);

            cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths));
            jsb.fileUtils.setSearchPaths(searchPaths);

            cc.audioEngine.stopAll();
            cc.game.restart();
        }
    }

    //重新下载失败的文件
    private retryUpdate() {
        console.log('重新下载失败的文件');
        this._am.downloadFailedAssets();
    }

    onDestroy() {
        if(this._checkListener){
            cc.eventManager.removeListener(this._checkListener);
            this._checkListener = null;
        }

        if (this._updateListener) {
            cc.eventManager.removeListener(this._updateListener);
            this._updateListener = null;
        }
        if (this._am && !cc.sys.ENABLE_GC_FOR_NATIVE_OBJECTS) {
            this._am.release();
        }
    }
}
