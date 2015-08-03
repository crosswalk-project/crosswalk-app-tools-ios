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
        // TODO implement generation of project.
        var output = this.application.output;
        output.info("iOSProject: Generating " + packageId);

        var template_dir = Path.join(__dirname, '..', 'data', 'AppShell');
        var parts = packageId.split('.');
        var project_name = parts[parts.length - 1];
        var project_dir = this.platformPath;
        var manifest_template_file = Path.join(__dirname, '..', 'data', 'manifest.json');

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
        this.logOutput.info('Created package directory: ' + this.pkgPath);
        Shell.cp('-Rf', template_dir, this.prjPath);
        Shell.mv(Path.join(this.prjPath, 'AppShell'), project_dir);
        this.logOutput.info('Copy template application from: ' + template_dir + ' to: ' + project_dir);
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
        this.logOutput.info('Convert project name into: ' + project_name);

        // Replace package name in info.plist.
        var info_file = Path.join(project_dir, project_name, 'Info.plist');
        var project_name_prefix = Path.basename(packageId, '.' + project_name);
        if (Shell.test('-f', info_file)) {
            Shell.sed('-i', /org.crosswalk-project/gi, project_name_prefix, info_file);
        }
        Shell.popd();

        if (Shell.test('-d', this.appPath)) {
            Shell.rm('-rf', this.appPath);
        }

        Shell.mkdir('-p', this.appPath);
        Shell.cp('-Rf', manifest_template_file, this.appPath);
        this.logOutput.info('Created application directory: ' + this.appPath + ' and copied the template manifest.json into it.');

        // Null means success, error string means failure.
        callback(null);

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
            // TODO implement updating of project to new Crosswalk version.
            output.info("iOSProject: Building project " + packageId);

            var Fs = require ('fs');

            var project_dir = this.platformPath;
            var parts = packageId.split('.');
            var project_name = parts[parts.length-1];

            if (project_name == "" || project_name == null) {
                callback("Please provide the project name.");
                return;
            }

            output.info('Start to update the web resources.');

            if (Shell.test('-d', Path.join(project_dir, 'www'))) {
                Shell.rm('-rf', Path.join(project_dir, 'www'));
                this.logOutput.info('Remove www directory in ' + project_dir);
            }

            Shell.cp('-Rf', this.appPath, project_dir);
            this.logOutput.info('Copy application contents from: ' + this.appPath + ' to: ' + project_dir);
            Shell.mv('-f', Path.join(project_dir, 'app'), Path.join(project_dir, 'www'));

            Shell.pushd(project_dir);
            var project_path = Path.join(project_dir, project_name + '.xcodeproj', 'project.pbxproj');
            var project = require ('xcode').project(project_path);
            var Plist = require('plist');
            var Manifest = require(Path.join(project_dir, 'www', 'manifest.json'));
            var version = Manifest.xwalk_version || Manifest.version || "0.1";
            this.logOutput.info('Check the version of manifest.json.');
            if (!this.checkVersion(version)) {
                callback("Application version is wrong.");
                return;
            }

            project.parse(function (err) {
                var output = this.application.output;

                // Generate manifest.plist file
                Fs.writeFileSync(Path.join(project_dir, 'www', 'manifest.plist'), Plist.build(Manifest));
                this.logOutput.info('Generate manifest.plist file from manifest.json.');
                // Replace the application version number
                var info_file = Path.join(project_dir, project_name, 'Info.plist');
                var info = Plist.parse(Fs.readFileSync(info_file, 'utf8'));
                info.CFBundleShortVersionString = version;
                Shell.rm('-f', info_file);
                Fs.writeFileSync(info_file, Plist.build(info));
                this.logOutput.info('Replace the application\'s version number.');
                // Add the real resource files.
                Shell.pushd(Path.join(project_dir, 'www'));
                Shell.popd();

                Fs.writeFileSync(project_path, project.writeSync());
                output.info('Finished update resources.');
                output.info('Start to build ipa file.');
                var options = {'path': project_dir, 'id': packageId};

                if (args.sdk)
                    options.sdk = args.sdk;
                if (args.sign)
                    options.sign = args.sign;
                if (args.provision)
                    options.provision = args.provision;
                this.logOutput.info('Create SDK object to execute the actual build.');
                var sdk = new SDK(this.application, options);
                if (sdk.build(['arm64', 'armv7', 'armv7s'], configId == 'release')) {
                    this.exportPackage(Shell.ls(Path.join(project_dir, 'build', project_name + '*.ipa'))[0]);
                }
            }.bind(this));
            Shell.popd();
            // Null means success, error string means failure.
            callback(null);
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
