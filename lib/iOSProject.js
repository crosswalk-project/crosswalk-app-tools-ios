// Copyright © 2014 Intel Corporation. All rights reserved.
// Use  of this  source  code is  governed by  an Apache v2
// license that can be found in the LICENSE-APACHE-V2 file.

var Config = null;
var Console = null;
var Downloader = null;
var Shell = require ("shelljs");
var Path = require ('path');
var SDK = require ('./iOSSDK');

function iOSPlatform(PlatformBase, baseData, args) {
    /**
     * Interface for project implementations.
     * @constructor
     * @protected
     */
    function iOSProject(PlatformBase, baseData, args) {
        PlatformBase.call(this, baseData);
        this.sdk = args.sdk || '';
        this.sign = args.sign || '';
        this.provision = args.provision || '';
        Console = console;
    }

    iOSProject.prototype = PlatformBase.prototype;
    /**
     * Generate project template.
     * @function generate
     * @param {String} packageId Package name in com.example.Foo format.
     * @param {Function} callback see {@link Project~projectOperationCb}.
     * @abstract
     * @memberOf Project
     */
    iOSProject.prototype.generate =
        function(options, callback) {

            // TODO implement generation of project.
            Console.log("iOSProject: Generating " + this.packageId);

            var template_dir = Path.join(__dirname, '..', 'data', 'AppShell');
            var parts = this.packageId.split('.');
            var project_name = parts[parts.length - 1];
            var project_dir = this.platformPath;

            if (project_name == "" || project_name == null) {
                callback("Please provide the project name.");
                return;
            }

            if (Shell.test('-d', project_dir)) {
                callback("The project has been already existed: " + project_dir);
                return;
            }

            if (!Shell.test('-d', template_dir)) {
                callback("Can not find project template files: " + template_dir);
                return;
            }
            Shell.mkdir('-p', this.pkgPath);
            Shell.cp('-Rf', template_dir, this.prjPath);
            Shell.mv(Path.join(this.prjPath, 'AppShell'), project_dir);
            Shell.pushd(project_dir);
            Shell.ls (".").filter (function (file) {
                var new_file = file.replace (/AppShell/gi, project_name);
                if (file != new_file)
                    Shell.mv ('-f', file, new_file);
            });
            var xcodeproj = project_name+".xcodeproj";
            Shell.find (xcodeproj).filter (function (file) {
                if (Shell.test ('-f', file)) {
                    Shell.sed ('-i', /AppShell/gi, project_name, file);
                    Shell.mv('-f', file, file.replace (/AppShell/gi, project_name));
                }
            });

            // Replace package name in info.plist.
            var info_file = Path.join(project_dir, project_name, 'Info.plist');
            var project_name_prefix = Path.basename(this.packageId, '.' + project_name);
            if (Shell.test('-f', info_file)) {
                Shell.sed('-i', /org.crosswalk-project/gi, project_name_prefix, info_file);
            }
            Shell.popd();

            if (Shell.test('-d', this.appPath)) {
                Shell.rm('-rf', this.appPath);
            }

            Shell.mv('-f', Path.join(project_dir, 'www'), this.appPath);

            // Null means success, error string means failure.
            callback(null);
        };

    iOSProject.prototype.update =
        function(callback) {

            // TODO implement updating of project to new Crosswalk version.
            // This function is not supported yet.
            Console.log("iOSProject: Updating project has not implemented.");

            // Null means success, error string means failure.
            callback(null);
        };

    iOSProject.prototype.refresh =
        function(callback) {

            // TODO implement updating of project to new Crosswalk version.
            // Maybe this function will be not needed, and removed in the future.
            Console.log("iOSProject: Refreshing project has not implemented.");

            // Null means success, error string means failure.
            callback(null);
        };

    iOSProject.prototype.checkVersion = function (version) {
        var parts = version.split('.');
        var ret = true;
        if (parts.length > 3) {
            Console.log("The version number section length should < 4");
            ret = false;
        }
        return ret;
    };

    /**
     * Build application package.
     * @function build
     * @param {String[]} abi Array of ABIs, supported armeabi-v7a, x86.
     * @param {Boolean} release Whether to build debug or release package.
     * @param {Function} callback see {@link Project~projectOperationCb}.
     * @abstract
     * @memberOf Project
     */
    iOSProject.prototype.build =
        function(abis, release, callback) {

            var packageId = Path.basename(Shell.pwd());
            // TODO implement updating of project to new Crosswalk version.
            Console.log("iOSProject: Building project " + packageId);

            var Fs = require ('fs');

            var project_dir = this.platformPath;
            var parts = packageId.split('.');
            var project_name = parts[parts.length-1];

            if (project_name == "" || project_name == null) {
                callback("Please provide the project name.");
                return;
            }

            Console.log('Start to update the web resources.');

            if (Shell.test('-d', Path.join(project_dir, 'www'))) {
                Shell.rm('-rf', Path.join(project_dir, 'www'));
            }

            Shell.cp('-Rf', this.appPath, project_dir);
            Shell.mv('-f', Path.join(project_dir, 'app'), Path.join(project_dir, 'www'));

            Shell.pushd(project_dir);
            var project_path = Path.join(project_dir, project_name + '.xcodeproj', 'project.pbxproj');
            var project = require ('xcode').project(project_path);
            var Plist = require('plist');
            var Manifest = require(Path.join(project_dir, 'www', 'manifest.json'));
            var version = Manifest.xwalk_version || Manifest.version || "0.1";
            if (!this.checkVersion(version)) {
                callback("Application version is wrong.");
                return;
            }

            project.parse(function (err) {
                // Generate manifest.plist file
                Fs.writeFileSync(Path.join(project_dir, 'www', 'manifest.plist'), Plist.build(Manifest));
                // Replace the application version number
                var info_file = Path.join(project_dir, project_name, 'Info.plist');
                var info = Plist.parse(Fs.readFileSync(info_file, 'utf8'));
                info.CFBundleShortVersionString = version;
                Shell.rm('-f', info_file);
                Fs.writeFileSync(info_file, Plist.build(info));
                // Add the real resource files.
                Shell.pushd(Path.join(project_dir, 'www'));
                Shell.popd();

                Fs.writeFileSync(project_path, project.writeSync());
                Console.log('Finished update resources.');
                Console.log('Start to build ipa file.');
                var options = {'path': project_dir, 'id': packageId};
                
                if (this.sdk.length > 0)
                    options.sdk = this.sdk;
                if (this.sign.length > 0)
                    options.sign = this.sign;
                if (this.provision.length > 0)
                    options.provision = this.provision;
                var sdk = new SDK(options);
                if (sdk.build(['arm64', 'armv7', 'armv7s'], release)) {
                    this.exportPackage(Shell.ls(Path.join(project_dir, 'build', project_name + '*.ipa'))[0]);
                }
            }.bind(this));
            Shell.popd();
            // Null means success, error string means failure.
            callback(null);
        };
    return new iOSProject(PlatformBase, baseData, args);
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
