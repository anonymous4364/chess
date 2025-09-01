// DOM Elements
const boardDiv = document.getElementById("board");
const flip = document.getElementById("flip");
const autoFlip = document.getElementById("autoFlip");
const whiteCapturedPieces = document.getElementById("whiteCapturedPieces");
const blackCapturedPieces = document.getElementById("blackCapturedPieces");

// 2d 8x8 board
let grid = Array.from({length : 8}, () => Array(8).fill("."));

// Sets the board and renders it
function setBoard() {
    // Black pieces
    grid[0] = ["r", "n", "b", "q", "k", "b", "n", "r"];
    for (let i = 0; i < 8; i++) grid[1][i] = "p";

    // Empty spots
    for (let i = 2; i < 6; i++) 
        for (let j = 0; j < 8; j++)
            grid[i][j] = ".";
    
    // White pieces
    grid[7] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
    for (let i = 0; i < 8; i++) grid[6][i] = "P";
}

// map pieces
const pieceMap = {
    "P": "chess-pawn-regular-full.svg",    // white pawn
    "p": "chess-pawn-solid-full.svg",      // black pawn
    "R": "chess-rook-regular-full.svg",    // white rook
    "r": "chess-rook-solid-full.svg",      // black rook
    "N": "chess-knight-regular-full.svg",  // white knight
    "n": "chess-knight-solid-full.svg",    // black knight
    "B": "chess-bishop-regular-full.svg",  // white bishop
    "b": "chess-bishop-solid-full.svg",    // black bishop
    "Q": "chess-queen-regular-full.svg",   // white queen
    "q": "chess-queen-solid-full.svg",     // black queen
    "K": "chess-king-regular-full.svg",    // white king
    "k": "chess-king-solid-full.svg"       // black king
};

let squares = []; // stores the 64 squares
let flipped = false;
let clicked = null; // handles first click
let lastMovedFrom = null;
let lastMovedTo = null;
let lastLogicalFromRow; 
let lastLogicalFromCol;
let lastLogicalToRow;
let lastLogicalToCol;
let isWhiteTurn = true;
let didWhiteKingMove = false;
let didBlackKingMove = false;
let didWhiteKingSideRookMove = false;
let didWhiteQueenSideRookMove = false;
let didBlackKingSideRookMove = false;
let didBlackQueenSideRookMove = false;
let lastMove = null // history for en passent
let whiteKingRow = 7;
let whiteKingCol = 4;
let blackKingRow = 0;
let blackKingCol = 4;

// render the board
function render(){
    if (squares.length < 1) {
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const square = document.createElement("div");
                square.classList.add("square");
                (i + j) % 2 == 0 ? square.classList.add("light") : square.classList.add("dark");
                // coordinates of square
                square.dataset.row = i;
                square.dataset.col = j;
                boardDiv.appendChild(square);
                squares.push(square);
            }
        }
    }

    // clear any old highlighting
    for (let square of squares) square.classList.remove("selected", "moved-to");

    // add images 
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = grid[i][j];
            const r = flipped ? 7 - i : i;
            const c = flipped ? 7 - j : j;
            const square = squares[r * 8 + c];

            // clear old images
            square.innerHTML = "";

            if (piece !== ".") {
                const img = document.createElement("img");
                img.src = pieceMap[grid[i][j]];
                square.appendChild(img);
            }
        }
    }
}

flip.addEventListener("click", () => {
    clicked = null;       // deselect current piece
    clearValidSquaresHighlights();  // Clear valid move highlights on flip
    flipped = !flipped;   // toggle flip
    render();             // redraw the board
    updateHighlights();   // restore last move highlights
});

boardDiv.addEventListener("click", event => {
    // get the square not the image
    const square = event.target.closest(".square");
    if (!square) return;

    let row = parseInt(square.dataset.row);
    let col = parseInt(square.dataset.col);

    // re-assign row and col if board is flipped
    if (flipped) { row = 7 - row; col = 7 - col }

    if (!clicked) {
        // First click: select a piece (must not be empty)
        const pieceFrom = grid[row][col];
        // empty piece
        if (pieceFrom === ".") return; 
        // turn check
        if ((isWhiteTurn && pieceFrom === pieceFrom.toLowerCase()) ||
            (!isWhiteTurn && pieceFrom === pieceFrom.toUpperCase()) 
        ) {
            return;
        }
        clicked = { row, col, element: square };
        // highlight first move
        clicked.element.classList.add("selected");
        highlightValidSquares(row, col);
    } else {
        // Second click: attempt to move
        const pieceFrom = grid[clicked.row][clicked.col];
        const targetPiece = grid[row][col];

        if (clicked.row == row && clicked.col == col) {
            // clicking same square again -> un-select
            clicked.element.classList.remove("selected");
            clicked = null;
            clearValidSquaresHighlights();  // Clear valid move highlights on deselect
            return;
        }
       
        if (targetPiece !== "." &&
            ((isWhiteTurn && targetPiece === targetPiece.toUpperCase()) ||
             (!isWhiteTurn && targetPiece === targetPiece.toLowerCase())) 
        ) {
            // clicking another piece (own color) -> reselect
            clicked.element.classList.remove("selected");
            clearValidSquaresHighlights();  // Clear old valid highlights before reselect
            square.classList.add("selected");
            clicked = { row, col, element: square };
            highlightValidSquares(row, col);  // Highlight valid moves for the new selection
            return;
        }
        // attempt to move
        if (isValidPieceMove(clicked.row, clicked.col, row, col)) {
            if (grid[row][col] !== ".") {
                capture(clicked.row, clicked.col, row, col);
            }
            if (move(clicked.row, clicked.col, row, col)) {
                // Remove the temporary "selected" class 
                clicked.element.classList.remove("selected");

                // update highlights // clear old highlightings // highlight new move  // store last moved squares
                lastLogicalFromRow = clicked.row;
                lastLogicalFromCol = clicked.col;
                lastLogicalToRow = row;
                lastLogicalToCol = col;

                updateHighlights();

                clearValidSquaresHighlights();  // Clear valid move highlights after successful move

                // reset
                clicked = null;
                isWhiteTurn = !isWhiteTurn;
            } else {
                // no valid move
                clicked.element.classList.remove("selected");
                clearValidSquaresHighlights();  // Clear valid move highlights on invalid target deselect
                clicked = null; 
            }
        } else {
            // no valid move
            clicked.element.classList.remove("selected");
            clearValidSquaresHighlights();  // Clear valid move highlights on invalid target deselect
            clicked = null;
        }
    }
});

function capture(fromRow, fromCol, toRow, toCol) {
    const piece = grid[fromRow][fromCol];
    const target = grid[toRow][toCol];

    if (target === ".") return;

    const pieceIsWhite = piece === piece.toUpperCase();
    const pieceIsBlack = piece === piece.toLowerCase();
    const targetIsWhite = target === target.toUpperCase();
    const targetIsBlack = target === target.toLowerCase();
    
    let isWhiteKingInCheck = isSquareAttacked(whiteKingRow, whiteKingCol, false);
    let isBlackKingInCheck = isSquareAttacked(blackKingRow, blackKingCol, true);

    if (!((isWhiteTurn && isWhiteKingInCheck) || (!isWhiteTurn && isBlackKingInCheck))) {
        if (pieceIsWhite && targetIsBlack) {
            const img = document.createElement("img");
            img.src = pieceMap[target];
            img.classList.add("img"); 
            whiteCapturedPieces.appendChild(img); 
            }
        else if (pieceIsBlack && targetIsWhite) {
            const img = document.createElement("img");
            img.src = pieceMap[target];
            img.classList.add("img"); 
            blackCapturedPieces.appendChild(img);
        } 
    }
}

function move(fromRow, fromCol, toRow, toCol) {
    const movingPiece = grid[fromRow][fromCol];
    const fromIsWhite = movingPiece === movingPiece.toUpperCase();
    let backUp = cloneBoard(grid);
    
    // castling
    const type = isValidKingMove(fromRow, fromCol, toRow, toCol);
    if (type === "whiteKingSideCastling") {
        // move king
        grid[7][6] = grid[7][4]; grid[7][4] = ".";
        // move rook
        grid[7][5] = grid[7][7]; grid[7][7] = ".";
        didWhiteKingMove = true; didWhiteKingSideRookMove = true;
        whiteKingRow = 7; whiteKingCol = 6;
    } else if (type === "whiteQueenSideCastling") {
        grid[7][2] = grid[7][4]; grid[7][4] = ".";
        grid[7][3] = grid[7][0]; grid[7][0] = ".";
        didWhiteKingMove = true; didWhiteQueenSideRookMove = true;
        whiteKingRow = 7; whiteKingCol = 2;
    } else if (type === "blackKingSideCastling") {
        grid[0][6] = grid[0][4]; grid[0][4] = ".";
        grid[0][5] = grid[0][7]; grid[0][7] = ".";
        didBlackKingMove = true; didBlackKingSideRookMove = true;
        blackKingRow = 0; blackKingCol = 6;
    } else if (type === "blackQueenSideCastling") {
        grid[0][2] = grid[0][4]; grid[0][4] = ".";
        grid[0][3] = grid[0][0]; grid[0][0] = ".";
        didBlackKingMove = true; didBlackQueenSideRookMove = true;
        blackKingRow = 0; blackKingCol = 2;
    } else {
        // en passant capture
        const enPassant = isValidPawnMove(fromRow, fromCol, toRow, toCol);
        if (enPassant === "en passant") {
            const capturedRow = fromIsWhite ? toRow + 1 : toRow -1;
            grid[capturedRow][toCol] = "."; // remove captured pawn
        }
        // move
        grid[toRow][toCol] = grid[fromRow][fromCol];
        grid[fromRow][fromCol] = ".";
        
        // history for en passent
        lastMove = {
            piece : movingPiece,
            color : isWhiteTurn ? "white" : "black",
            fromRow : fromRow,
            fromCol : fromCol,
            toRow : toRow,
            toCol : toCol
        };
        // castling flasgs
        if (movingPiece === "K") {
            didWhiteKingMove = true;
            whiteKingRow = toRow;
            whiteKingCol = toCol;
        } 
        if (movingPiece === "k") {
            didBlackKingMove = true;
            blackKingRow = toRow;
            blackKingCol = toCol;
        } 
        if (movingPiece === "R" && fromRow === 7 && fromCol === 0) didWhiteQueenSideRookMove = true;
        if (movingPiece === "r" && fromRow === 0 && fromCol === 0) didBlackQueenSideRookMove = true;
        if (movingPiece === "R" && fromRow === 7 && fromCol === 7) didWhiteKingSideRookMove = true;
        if (movingPiece === "r" && fromRow === 0 && fromCol === 7) didBlackKingSideRookMove = true;
    }

    let isWhiteKingInCheck = isSquareAttacked(whiteKingRow, whiteKingCol, false);
    let isBlackKingInCheck = isSquareAttacked(blackKingRow, blackKingCol, true);

    if ((isWhiteTurn && isWhiteKingInCheck) || (!isWhiteTurn && isBlackKingInCheck)) {
        grid = backUp;
        return false;
    }

    // flip first if needed
    if (autoFlip.checked) flipped = !flipped;

    // promotion
    const promotionRow = isWhiteTurn ? 0 : 7;
    if ((isWhiteTurn && movingPiece === "P" && toRow === promotionRow) ||
        ((!isWhiteTurn && movingPiece === "p" && toRow === promotionRow)) 
    ) {
        let choice = prompt("Promote to (Q, R, B, N)?");
        if (!choice) choice = "Q"; // IF CANCELLED
        if (!"QRBN".includes(choice.toUpperCase())) choice = "Q"; // default
        grid[toRow][toCol] = isWhiteTurn ? `${choice.toUpperCase()}` : `${choice.toLowerCase()}`;
    }

    render(); // render at last      
    return true;  
}

function updateHighlights() {
    // no move yet to highlight
    if (lastLogicalFromRow === undefined) return;

    const fromDisplayRow = flipped ? 7 - lastLogicalFromRow : lastLogicalFromRow;
    const fromDisplayCol = flipped ? 7 - lastLogicalFromCol : lastLogicalFromCol;
    const toDisplayRow = flipped ? 7 - lastLogicalToRow : lastLogicalToRow;
    const toDisplayCol = flipped ? 7 - lastLogicalToCol : lastLogicalToCol;

    const fromSquare = squares[fromDisplayRow * 8 + fromDisplayCol];
    const toSquare = squares[toDisplayRow * 8 + toDisplayCol];

    if (lastMovedFrom) lastMovedFrom.classList.remove("selected");
    if (lastMovedTo) lastMovedTo.classList.remove("moved-to");

    lastMovedFrom = fromSquare;
    lastMovedFrom.classList.add("selected");
    lastMovedTo = toSquare
    lastMovedTo.classList.add("moved-to");
}

function isValidPieceMove(fromRow, fromCol, toRow, toCol) {
    // get the piece
    const piece = grid[fromRow][fromCol];

    switch(piece.toUpperCase()) {
        case "P":
            return isValidPawnMove(fromRow, fromCol, toRow, toCol); 
        case "R":
            return isValidRookMove(fromRow, fromCol, toRow, toCol); 
        case "N":
            return isValidKnightMove(fromRow, fromCol, toRow, toCol);
        case "B":
            return isValidBishopMove(fromRow, fromCol, toRow, toCol); 
        case "Q":
            return isValidQueenMove(fromRow, fromCol, toRow, toCol); 
        case "K":
            return isValidKingMove(fromRow, fromCol, toRow, toCol); 
    }

    return false;
}

function isValidPawnMove(fromRow, fromCol, toRow, toCol) {
    // direction white is up black is down
    const fromPiece = grid[fromRow][fromCol];
    const fromIsWhite = fromPiece === fromPiece.toUpperCase();
    const direction = fromIsWhite ? -1 : 1;
    // moving one square
    if (toRow === fromRow + direction && toCol === fromCol && grid[toRow][toCol] === ".") return true;
    // moving two squares
    if (toRow === fromRow + 2 * direction && toCol === fromCol && grid[toRow][toCol] === ".") {
        const startingPosition = fromIsWhite ? 6 : 1;
        if (fromRow === startingPosition && grid[fromRow + direction][toCol] === ".") {
            return true;
        }
    }
    // 3. Capturing diagonally
    const colDifference = Math.abs(toCol - fromCol);

    if (colDifference === 1 && toRow === fromRow + direction && grid[toRow][toCol] !== ".") return true;

    // 4. en passent
    const enPassantRow = fromIsWhite ? 3 : 4;
    if (toRow === fromRow + direction &&
        grid[toRow][toCol] === "." &&
        fromRow === enPassantRow && 
        Math.abs(toCol - fromCol) === 1) if (
            lastMove && 
            lastMove.piece.toUpperCase() === "P" && // must be a pawn
            Math.abs(lastMove.toRow - lastMove.fromRow) === 2 && // last piece move direction must be 2
            lastMove.toCol === toCol && // same col
            lastMove.toRow === fromRow //  // it ended next to pawn
        ) return "en passant";

    return false;
    
}

function isValidKingMove(fromRow, fromCol, toRow, toCol) {
    // movement of 1 square in any direction
    const rowDifference = Math.abs(toRow - fromRow);
    const colDifference = Math.abs(toCol - fromCol);

    const fromPiece = grid[fromRow][fromCol];
    const fromIsWhite = fromPiece === fromPiece.toUpperCase();
    const fromIsBlack = fromPiece === fromPiece.toLowerCase();

    // attacker is the opposite color of fromPiece
    if (((rowDifference === 1 && colDifference === 0) || // vertical 
        (colDifference === 1 && rowDifference === 0) || // horizontal
        (colDifference === 1 && rowDifference === 1))  // diagonal 
    ) {
        // stimulate move
        const backUp = cloneBoard(grid);
        grid[toRow][toCol] = fromPiece;
        grid[fromRow][fromCol] = ".";
        const isSafe = !isSquareAttacked(toRow, toCol, !fromIsWhite);
        grid = backUp;
        if (isSafe) return true;
    }

    // castling
    const startRow = fromIsWhite ? 7 : 0;
    // white king side castling
    if (colDifference === 2 && rowDifference === 0 && fromIsWhite && fromRow === startRow && toCol === fromCol + 2) {
        if ((isPathClear(7, 4, 7, 7) && 
            (!isSquareAttacked(7, 4, false)) && // attacked by black ?
            (!isSquareAttacked(7, 5, false)) &&
            (!isSquareAttacked(7, 6, false)) &&
            (!didWhiteKingMove && !didWhiteKingSideRookMove))) return "whiteKingSideCastling";
    }
    // white queen side castling
    if (colDifference === 2 && rowDifference === 0 && fromIsWhite && fromRow === startRow && toCol === fromCol - 2) {
        if ((isPathClear(7, 4, 7, 0) && 
            (!isSquareAttacked(7, 4, false)) &&
            (!isSquareAttacked(7, 3, false)) &&
            (!isSquareAttacked(7, 2, false)) &&
            (!didWhiteKingMove && !didWhiteQueenSideRookMove))) return "whiteQueenSideCastling";
    }
    // black king side castling
    if (colDifference === 2 && rowDifference === 0 && fromIsBlack && fromRow === startRow && toCol === fromCol + 2) {
        if ((isPathClear(0, 4, 0, 7) && 
            (!isSquareAttacked(0, 4, true)) && // attacked by white ?
            (!isSquareAttacked(0, 5, true)) &&
            (!isSquareAttacked(0, 6, true)) &&
            (!didBlackKingMove && !didBlackKingSideRookMove))) return "blackKingSideCastling";
    }
    // black queen side castling
    if (colDifference === 2 && rowDifference === 0 && fromIsBlack && fromRow === startRow && toCol === fromCol - 2) {
        if ((isPathClear(0, 4, 0, 0) && 
            (!isSquareAttacked(0, 4, true)) &&
            (!isSquareAttacked(0, 3, true)) &&
            (!isSquareAttacked(0, 2, true)) &&
            (!didBlackKingMove && !didBlackQueenSideRookMove))) return "blackQueenSideCastling";
    }

    return false; 
}

function isValidKnightMove(fromRow, fromCol, toRow, toCol) {
    // L shape movement
    const rowDifference = Math.abs(toRow - fromRow);
    const colDifference = Math.abs(toCol - fromCol);

    if ((rowDifference === 2 && colDifference === 1) || 
        (rowDifference === 1 && colDifference === 2)) return true;

    return false;
}

function isPathClear(fromRow, fromCol, toRow, toCol) {
    let rowStep = 0; 
    let colStep = 0;

    if (toRow > fromRow) rowStep = 1;
    if (toRow < fromRow) rowStep = -1;
    if (toCol > fromCol) colStep = 1;
    if (toCol < fromCol) colStep = -1;

    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;

    while ((currentRow !== toRow) || (currentCol !== toCol)) {
        if (grid[currentRow][currentCol] !== ".") return false;
        currentRow += rowStep; currentCol += colStep;
    }

    return true;
}

function isValidRookMove(fromRow, fromCol, toRow, toCol) {
    // rook moves either vertically or horizontally
    if (fromRow !== toRow && fromCol !== toCol) return false; 

    // check if path is clear
    if (!isPathClear(fromRow, fromCol, toRow, toCol)) return false;

    return true;
}

function isValidBishopMove(fromRow, fromCol, toRow, toCol) {
    // bishop moves diagonally
    if ((Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol))) return false;

    // check if path is clear
    if (!isPathClear(fromRow, fromCol, toRow, toCol)) return false;

    return true;
}

function isValidQueenMove(fromRow, fromCol, toRow, toCol) {
    if (!isValidRookMove(fromRow, fromCol, toRow, toCol) &&
        !isValidBishopMove(fromRow, fromCol, toRow, toCol)) return false;
    return true;
}

let highlightedSquares = [];

function highlightValidSquares(fromRow, fromCol) {
    clearValidSquaresHighlights();

    const piece = grid[fromRow][fromCol];
    if (piece === ".") return;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const target = grid[r][c];

            //Skip only if target is occupied by a piece of the same color (both uppercase/white or both lowercase/black)
            const pieceIsWhite = piece === piece.toUpperCase();
            const targetIsWhite = target === target.toUpperCase();
            if (target !== "." && pieceIsWhite === targetIsWhite) continue;

            if (isValidPieceMove(fromRow, fromCol, r, c)) {
                const validRow = flipped ? 7 - r : r;
                const validCol = flipped ? 7 - c : c;
                const square = squares[validRow * 8 + validCol];

                if (grid[r][c] !== ".") {
                    square.classList.add("capture");
                } else {
                    const enPassant = isValidPawnMove(fromRow, fromCol, r, c);
                    if (enPassant === "en passant") {
                        square.classList.add("capture");
                    } else {
                        square.classList.add("valid-move");
                    }
                }
                highlightedSquares.push(square);
            }
        }
    }
}

function clearValidSquaresHighlights() {
    highlightedSquares.forEach(sq => {
        sq.classList.remove("capture", "valid-move");
    });

    highlightedSquares = [];
}

function isSquareAttacked(toRow, toCol, byWhite) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = grid[r][c];
            if (piece === ".") continue // no piece

            const pieceIsWhite = piece === piece.toUpperCase();
            if (pieceIsWhite !== byWhite) continue // skip own color

            switch(piece.toUpperCase()) {
                case "P": // pawn attack is not straight
                    const rowDirection = pieceIsWhite ? -1 : 1;
                    if (toRow === r + rowDirection && (toCol === c - 1 || toCol === c + 1)) return true;
                    break;
                case "R":
                    if (isValidRookMove(r, c, toRow, toCol)) return true; break;
                case "N":
                    if (isValidKnightMove(r, c, toRow, toCol)) return true; break;
                case "B":
                    if (isValidBishopMove(r, c, toRow, toCol)) return true; break;
                case "Q":
                    if (isValidQueenMove(r, c, toRow, toCol)) return true; break;
                case "K":
                    if ((Math.abs(toRow - r) === 1 && Math.abs(toCol - c) === 1) ||
                        (Math.abs(toRow - r) === 1 && Math.abs(toCol - c) === 0) ||
                        (Math.abs(toRow - r) === 0 && Math.abs(toCol - c) === 1)) return true; break;
            }
        }
    }
    return false;
}

function main() {
    setBoard();
    render();
}

function cloneBoard(grid) {
    const cloned = [];
    for (let r = 0; r < 8; r++) {
        cloned[r] = [];
        for (let c = 0; c < 8; c++) {
            cloned[r][c] = grid[r][c];
        }
    }
    return cloned;
}

main();

