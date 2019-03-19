"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var file_uri_to_path_1 = __importDefault(require("file-uri-to-path"));
var file_url_1 = __importDefault(require("file-url"));
var lodash_1 = __importDefault(require("lodash"));
var path = __importStar(require("path"));
var vscode_languageserver_1 = require("vscode-languageserver");
var fileLoadingPorts = __importStar(require("../file-loading-ports"));
var dependencies = __importStar(require("../util/dependencies"));
var loggingPorts = __importStar(require("../util/logging-ports"));
function start(config, info, project) {
    // Disable console logging while in language server mode
    // otherwise in stdio mode we will not be sending valid JSON
    console.log = console.warn = console.error = function () { };
    var connection = vscode_languageserver_1.createConnection(vscode_languageserver_1.ProposedFeatures.all);
    run(config, project, function (elm) {
        var report = null;
        var documents = new vscode_languageserver_1.TextDocuments();
        documents.listen(connection);
        connection.listen();
        connection.onInitialize(function (params) { return ({
            capabilities: {
                textDocumentSync: {
                    openClose: true,
                    willSave: true,
                    change: vscode_languageserver_1.TextDocumentSyncKind.Full
                },
                textDocument: {
                    publishDiagnostics: {
                        relatedInformation: false
                    }
                }
            }
        }); });
        // The content of a text document has changed. This event is emitted
        // when the text document first opened or when its content has changed.
        documents.onDidOpen(validateTextDocument);
        documents.onDidChangeContent(validateTextDocument);
        documents.onDidSave(validateTextDocument);
        function validateTextDocument(change) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    elm.ports.fileWatch.send({
                        event: 'update',
                        file: path.relative(process.cwd(), file_uri_to_path_1.default(change.document.uri)),
                        content: change.document.getText()
                    });
                    return [2 /*return*/];
                });
            });
        }
        function publishDiagnostics(messages, uri) {
            var messagesForFile = messages.filter(function (m) {
                // Windows paths have a forward slash in the `message.file`, which won't
                // match with the end of the file URI we have from the language server event,
                // so this replaces backslashes before matching to get consistent behavior
                return uri.endsWith(m.file.replace('\\', '/'));
            });
            var diagnostics = messagesForFile.map(messageToDiagnostic);
            connection.sendDiagnostics({ uri: uri, diagnostics: diagnostics });
        }
        elm.ports.sendReportValue.subscribe(function (report) {
            // When publishing diagnostics it looks like you have to publish
            // for one URI at a time, so this groups all of the messages for
            // each file and sends them as a batch
            lodash_1.default.forEach(lodash_1.default.groupBy(report.messages, 'file'), function (messages, file) {
                return publishDiagnostics(messages, file_url_1.default(file));
            });
        });
    });
}
function messageToDiagnostic(message) {
    if (message.type === "FileLoadFailed") {
        return {
            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
            range: { start: { line: 0, character: 0 },
                end: { line: 1, character: 0 }
            },
            code: "1",
            message: "Error parsing file",
            source: 'elm-analyse'
        };
    }
    var _a = message.data.properties.range, lineStart = _a[0], colStart = _a[1], lineEnd = _a[2], colEnd = _a[3];
    var range = {
        start: { line: lineStart - 1, character: colStart - 1 },
        end: { line: lineEnd - 1, character: colEnd - 1 }
    };
    return {
        severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
        range: range,
        code: message.id,
        // Clean up the error message a bit, removing the end of the line, e.g.
        // "Record has only one field. Use the field's type or introduce a Type. At ((14,5),(14,20))"
        message: message.data.description.split(/at .+$/i)[0] + '\n' + ("See https://stil4m.github.io/elm-analyse/#/messages/" + message.type),
        source: 'elm-analyse'
    };
}
function run(config, project, onload) {
    dependencies.getDependencies(function (registry) {
        var Elm = require('../backend-elm.js').Elm;
        var app = Elm.Analyser.init({
            flags: {
                server: false,
                registry: registry || [],
                project: project
            }
        });
        loggingPorts.setup(app, config);
        fileLoadingPorts.setup(app, config, process.cwd());
        onload(app);
    });
}
exports.default = { start: start };
