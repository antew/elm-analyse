"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fileLoadingPorts = __importStar(require("./file-loading-ports"));
var loggingPorts = __importStar(require("./util/logging-ports"));
var dependencies = __importStar(require("./util/dependencies"));
var reporter_1 = __importDefault(require("./reporter"));
var directory = process.cwd();
var Elm = require('./backend-elm');
function start(config, project) {
    var reporter = reporter_1.default.build(config.format);
    startAnalyser(config, project, function (_, report) {
        reporter.report(report);
        var fail = report.messages.length > 0 || report.unusedDependencies.length > 0;
        process.exit(fail ? 1 : 0);
    });
}
function fix(path, config, project) {
    startAnalyser(config, project, function onReport(app, _) {
        app.ports.storeFile.subscribe(function (fileStore) {
            console.log("Saving file....");
        });
        app.ports.onFixFileMessage.send(path);
    });
}
function fixAll(config, project) {
    var initialReport;
    startAnalyser(config, project, function onReport(app, report) {
        if (!initialReport) {
            initialReport = report;
        }
        else {
            console.log('\n');
            console.log('Elm Analyse - Fix All Complete');
            console.log('------------------------------');
            console.log("Messages Before: " + initialReport.messages.length);
            console.log("Messages After : " + report.messages.length);
            console.log("Issues Fixed   : " + (initialReport.messages.length - report.messages.length));
            console.log('------------------------------');
            return;
        }
        var files = new Set(report.messages.map(function (m) { return m.file; }));
        var filesLeftToSave = files.size;
        app.ports.storeFile.subscribe(function (fileStore) {
            console.log("Writing file " + fileStore.file);
            filesLeftToSave--;
            if (filesLeftToSave === 0) {
                app.ports.onReset.send(true);
            }
        });
        files.forEach(function (file) {
            console.log("Fixing file: " + file);
            app.ports.onFixFileMessage.send(file);
        });
    });
}
function startAnalyser(config, project, onReport) {
    if (project === void 0) { project = {}; }
    dependencies.getDependencies(function (registry) {
        var app = Elm.Elm.Analyser.init({
            flags: {
                server: false,
                registry: registry || [],
                project: project
            }
        });
        app.ports.sendReportValue.subscribe(function (report) {
            onReport(app, report);
        });
        loggingPorts.setup(app, config);
        fileLoadingPorts.setup(app, config, directory);
    });
}
exports.default = { start: start, fix: fix, fixAll: fixAll };
