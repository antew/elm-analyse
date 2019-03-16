import * as path from 'path';
import { Config, Info, ElmApp, Report, Message } from '../domain';
import _ from 'lodash';
import worker from './worker';
import uri2path from 'file-uri-to-path';
import {
    createConnection,
    TextDocuments,
    TextDocumentChangeEvent,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams
} from 'vscode-languageserver';
import fileUrl from 'file-url'

function start(config: Config, info: Info, project: {}) {
    // Disable console logging while in language server mode
    // otherwise in stdio mode we will not be sending valid JSON
    console.log = console.warn = console.error = () => {};

    let connection = createConnection(ProposedFeatures.all);

    worker.run(config, project, function(elm: ElmApp) {
        let report: Report | null = null;
        let documents: TextDocuments = new TextDocuments();

        documents.listen(connection);
        connection.listen();

        connection.onInitialize((params: InitializeParams) => ({
            capabilities: {
                textDocumentSync: {
                    openClose: true,
                    willSave: true
                },
                textDocument: {
                    publishDiagnostics: {
                        relatedInformation: false
                    }
                }
            }
        }));

        // The content of a text document has changed. This event is emitted
        // when the text document first opened or when its content has changed.
        documents.onDidOpen(validateTextDocument);
        documents.onDidSave(validateTextDocument);

        async function validateTextDocument( change: TextDocumentChangeEvent ): Promise<void> {
            elm.ports.fileWatch.send({
                event: 'update',
                file: path.relative(process.cwd(), uri2path(change.document.uri))
            });
        }

        function publishDiagnostics(messages: Message[], uri: string) {
            const messagesForFile = messages.filter(m =>
                // Windows paths have a forward slash in the `message.file`, which won't
                // match with the end of the file URI we have from the language server event,
                // so this replaces backslashes before matching to get consistent behavior
                uri.endsWith(m.file.replace('\\', '/'))
            );

            let diagnostics: Diagnostic[] = messagesForFile.map(messageToDiagnostic);
            connection.sendDiagnostics({ uri: uri, diagnostics });
        }

        elm.ports.sendReportValue.subscribe(function(report) {
            // When publishing diagnostics it looks like you have to publish
            // for one URI at a time, so this groups all of the messages for
            // each file and sends them as a batch
            _.forEach(_.groupBy(report.messages, 'file'), (messages, file) => 
                publishDiagnostics(messages, fileUrl(file)));
        });
    });
}

function messageToDiagnostic(message: Message): Diagnostic {
    let [lineStart, colStart, lineEnd, colEnd] = message.data.properties.range;
    const range = {
        start: { line: lineStart - 1, character: colStart - 1 },
        end: { line: lineEnd - 1, character: colEnd - 1 }
    };
    return {
        severity: DiagnosticSeverity.Warning,
        range: range,
        // Clean up the error message a bit, removing the end of the line, e.g.
        // "Record has only one field. Use the field's type or introduce a Type. At ((14,5),(14,20))"
        message:
            message.data.description.split(/at .+$/i)[0] + '\n' + `See https://stil4m.github.io/elm-analyse/#/messages/${message.type}`,
        source: 'elm-analyse'
    };
}

export default { start };
