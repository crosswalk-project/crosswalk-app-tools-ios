// Copyright © 2014 Intel Corporation. All rights reserved.
// Use  of this  source  code is  governed by  an Apache v2
// license that can be found in the LICENSE-APACHE-V2 file.

var Config = null;
var Downloader = null;
var Shell = require ("shelljs");
var Path = require ('path');
var SDK = require ('./iOSSDK');

function iOSPlatform(PlatformBase, platformData) {
    /**
     * Interface for project implementations.
     * @constructor
     * @protected
     */
    function iOSProject(PlatformBase, platformData) {
        PlatformBase.call(this, platformData);
    }

    iOSProject.prototype = PlatformBase.prototype;
    Shell.config.silent = true;

    /**
     * Implements {@link PlatformBase.create}
     */
    iOSProject.prototype.create =
    function(packageId, args, callback) {
        var output = this.application.output;

        var parts = packageId.split('.');
        var project_name = parts[parts.length - 1];
        var project_dir = Path.join(this.platformPath, 'AppShell');

        if (project_name == "" || project_name == null) {
            callback("Please provide the project name.");
            return;
        }

        if (project_name == "www") {
            callback("Project name cannot be 'www', please avoid using 'www' as the suffix of your application ID");
            return;
        }

        if (Shell.test('-d', project_dir)) {
            callback("The project has been already existed: " + project_dir);
            return;
        }

        Shell.mkdir('-p', this.platformPath);
        this.logOutput.info('Created platform directory: ' + this.platformPath);
        // TODO(jondong): Use node git module instead of running git command
        // directly, in case the host platform hasn't get git installed.
        var that = this;
        var createPromise = new Promise(function(resolve, reject){
            var progress = output.createInfiniteProgress('Clone project');
            var counter = 0;
            var intervalId = setInterval(function(c) {
                progress.update('in progress: ' + ++counter);
            }, 1000);
            var cmdClone = ['git', 'clone', 'https://github.com/crosswalk-project/crosswalk-ios.git', that.platformPath];
            Shell.exec(cmdClone.join(' '), {async:true}, function(code, out){
                clearInterval(intervalId);
                progress.done('Cloned.');
                if (code == 0) {
                    resolve();
                } else {
                    reject(code, out);
                }
            });
        });

        createPromise.then(function() {
            if (Shell.which('pod') == null) {
                callback("You haven't install CocoaPods onto your local machine, which is needed to create your iOS application. Use 'sudo gem install cocoapods' to install the latest version. For more information about CocoaPods, please refer to: https://cocoapods.org/");
                return;
            }
            var progress = output.createInfiniteProgress('CocoaPods install');
            var counter = 0;
            var intervalId = setInterval(function(c) {
                progress.update('in progress: ' + ++counter);
            }, 1000);
            Shell.pushd(project_dir);
            var cmdInit = ['pod', 'install'];
            Shell.exec(cmdInit.join(' '), {async:true}, function(code, out){
                clearInterval(intervalId);
                progress.done('Installed.');
                Shell.popd();
                if (code != 0) {
                    callback(out);
                }
            });
        }, function(code, out) {
            callback(out);
        });
    }

    iOSProject.prototype.update =
        function(callback) {
            var output = this.application.output;

            // TODO implement updating of project to new Crosswalk version.
            // This function is not supported yet.
            output.error("iOSProject: Updating project has not implemented.");

            // Null means success, error string means failure.
            callback(null);
        };

    iOSProject.prototype.refresh =
        function(callback) {
            var output = this.application.output;

            // TODO implement updating of project to new Crosswalk version.
            // Maybe this function will be not needed, and removed in the future.
            output.error("iOSProject: Refreshing project has not implemented.");

            // Null means success, error string means failure.
            callback(null);
        };

    iOSProject.prototype.checkVersion = function (version) {
        var output = this.application.output;
        var parts = version.split('.');
        var ret = true;
        if (parts.length > 3) {
            output.error("The version number section length should < 4");
            ret = false;
        }
        return ret;
    };

    /**
     * Implements {@link PlatformBase.build}
     */
    iOSProject.prototype.build =
        function(configId, args, callback) {
            var output = this.application.output;
            var packageId = Path.basename(Shell.pwd());
            var Fs = require ('fs');

            var project_dir = Path.join(this.platformPath, 'AppShell');
            var parts = packageId.split('.');
            var project_name = parts[parts.length-1];

            if (project_name == "" || project_name == null) {
                callback("Please provide the project name.");
                return;
            }

            output.info('Update web resources.');

            if (Shell.test('-d', Path.join(project_dir, 'www'))) {
                Shell.rm('-rf', Path.join(project_dir, 'www'));
                this.logOutput.info('Remove www directory in ' + project_dir);
            }

            Shell.cp('-Rf', this.appPath, project_dir);
            this.logOutput.info('Copy application contents from: ' + this.appPath + ' to: ' + project_dir);
            Shell.mv('-f', Path.join(project_dir, 'app'), Path.join(project_dir, 'www'));

            // Generate manifest.plist file
            output.info('Generate manifest.plist file.');
            Shell.pushd(project_dir);
            var manifest = require(Path.join(project_dir, 'www', 'manifest.json'));
            var version = manifest.xwalk_version || manifest.version || "0.1";
            this.logOutput.info('Check the version of manifest.json.');
            if (!this.checkVersion(version)) {
                callback("Application version is wrong.");
                return;
            }
            var Plist = require('plist');
            Fs.writeFileSync(Path.join(project_dir, 'www', 'manifest.plist'), Plist.build(manifest));
            this.logOutput.info('Generate manifest.plist file from manifest.json.');
            var options = {'path': project_dir, 'id': packageId, 'version': version};

            if (args.sdk)
                options.sdk = args.sdk;
            if (args.sign)
                options.sign = args.sign;
            if (args.provision)
                options.provision = args.provision;
            this.logOutput.info('Create SDK object to execute the actual build.');
            var sdk = new SDK(this.application, options);
            var that = this;
            sdk.build(['arm64', 'armv7', 'armv7s'], configId == 'release').then(function(){
                that.exportPackage(Shell.ls(Path.join(project_dir, 'export', project_name + '.ipa'))[0]);
                Shell.popd();
                callback(null);
            }, function(code, out){
                Shell.popd();
                callback(out);
            });
        };
    return new iOSProject(PlatformBase, platformData);
}

iOSPlatform.getArgs = function () {
    return {
        'build': {
            'sdk': "\t\t\t\tThe Xcode SDK version.",
            'sign': "\t\t\t\tThe code signing identity.",
            'provision': "\t\t\tProvisioning Profile"
        }
    };
}

module.exports = iOSPlatform;
