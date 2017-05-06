module ASTUtil.WriterTests exposing (all)

import ASTUtil.Writer as Writer exposing (..)
import ASTUtil.ASTWriter as ASTWriter exposing (..)
import Test exposing (Test, test, describe)
import Expect


all : Test
all =
    describe "Writer"
        [ test "write single line parensComma" <|
            \() ->
                Writer.write
                    (parensComma False
                        [ (string "x")
                        , (string "y")
                        ]
                    )
                    |> Expect.equal "(x, y)"
        , test "write multi line parensComma" <|
            \() ->
                Writer.write
                    (parensComma True
                        [ (string "x")
                        , (string "y")
                        ]
                    )
                    |> Expect.equal "(x\n, y)"
        , test "indented breaked" <|
            \() ->
                Writer.write (indent 2 (breaked [ string "a", string "b" ]))
                    |> Expect.equal "  a\n  b"
        , test "qualified name without module" <|
            \() ->
                Writer.write (ASTWriter.writeQualifiedNameRef { moduleName = [], name = "Foo" })
                    |> Expect.equal "Foo"
        , test "qualified name with module" <|
            \() ->
                Writer.write (ASTWriter.writeQualifiedNameRef { moduleName = [ "Bar", "Baz" ], name = "Foo" })
                    |> Expect.equal "Bar.Baz.Foo"
        ]
