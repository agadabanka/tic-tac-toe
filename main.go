package main

import (
	"errors"
	"log"
	"fmt"
)

// Error codes returned by failures to evaluate the board
var (
	ErrInvalid            = errors.New("check: invalid board state")
	ErrBoardStateLength   = errors.New("check: board state is not a multiple of 2")
	ErrBoardStatePlayer   = errors.New("check: board state did not find expected player")
	ErrBoardStateRepeated = errors.New("check: board state found a repeated entry")

	ErrInvalid2 = errors.New("check: invalid board state2")
)

const (
	STATE_RUNNING = iota
	STATE_COMPLETE
	STATE_EMPTY
	STATE_UNKNOWN
)

type Status struct {
	boardState int
	winner     string
	isDraw     bool
}

type Board struct {
	state            string
	firstPlayerName  string
	secondPlayerName string
	winStates        []string
}

const (
	MAX_TURNS = 9 // there are at most 9 turns in a 3 x 3 tic-tac-toe game
)

// NewBoard returns a pointer to the new board enumeraed as shown below
// 1 2 3
// 4 5 6
// 7 8 9
// winStates represents a possible combination for winning the game
// Each board is represented as a string
// "XaYbXcYdXeYf"...
// where X = player 1 and Y = player 2
// a,b,c,... are one of [1,9]
func NewBoard(firstPlayerName string, secondPlayerName string) (b *Board) {
	winStates := []string{
		"123", "456", "789",
		"147", "258", "369",
		"159", "357",
	}

	return &Board{
		winStates: winStates,
	}
}

func (b *Board) GetPlayerCode(player string) (code string) {
	if player == b.firstPlayerName {
		code = "X"
	} else if player == b.secondPlayerName {
		code = "Y"
	}
	return
}

func (b *Board) UpdateBoard(player string, id string) (gameOver bool, err error) {
	var p1, p2 string
	var status *Status

	if player == b.firstPlayerName {
		p1, p2 = "X", "Y"
	} else {
		p2, p1 = "X", "Y"
	}
	input := b.GetPlayerCode(player) + id
	if status, err = b.CheckBoard(p1, p2, input); err != nil {
		fmt.Errorf("failed board check : %v", err)
		return false, err // propagate the error up in the chain OR handle here
	}
	if (*status).boardState == STATE_COMPLETE {
		if ((*status).winner != "") || (*status).isDraw {
			return true, nil
		}
	} else if (*status).boardState == STATE_RUNNING {
		b.state += input // update the state only all the inputs are valid
	}

	return false, nil
}

// CheckBoard validates the board. it also determines if the game has ended.
// If the game has ended, CheckBoard will determine the winner
// CheckBoard returns an Error if the board is Invalid
func (b *Board) CheckBoard(player1 string, player2 string, input string) (status *Status, err error) {
	var player, id string
	state := b.state + input
	if state == "" {
		return &Status{boardState: STATE_EMPTY}, nil
	}
	if len(state)%2 != 0 {
		return &Status{boardState: STATE_UNKNOWN}, ErrBoardStateLength
	}
	expected := player1
	other := player2
	pmap := map[string]map[string]int{"X": make(map[string]int), "Y": make(map[string]int)} // map of player -> ID -> count of ID
	for i := 0; i < len(state); i += 2 {
		player, id = string(state[i]), string(state[i+1])
		if player != expected {
			log.Errorf("player = %s, expected = %s", player, expected)
			return &Status{boardState: STATE_UNKNOWN}, ErrBoardStatePlayer
		}
		pmap[expected][id] += 1
		if pmap[expected][id] > 1 {
			return &Status{boardState: STATE_UNKNOWN}, ErrBoardStateRepeated
		}
		if _, ok := pmap[other][id]; ok {
			return &Status{boardState: STATE_UNKNOWN}, ErrBoardStateRepeated
		}
		if player == player1 {
			expected, other = player2, player1
		} else if player == player2 {
			expected, other = player1, player2
		} else {
			// TODO: another error here
		}
	}

	var winner string
winnerLoop:
	for p, ids := range pmap { // for each player, perform the following
		for _, winState := range b.winStates {
			counter := 0
			for _, s := range winState {
				if _, ok := ids[string(s)]; ok {
					counter += 1
				}
			}
			if counter == 3 {
				winner = p
				break winnerLoop
			}
		}
	}

	if winner != "" {
		return &Status{boardState: STATE_COMPLETE, winner: winner}, nil
	} else if len(state) >= 2 * MAX_TURNS && winner == "" {
		return &Status{boardState: STATE_COMPLETE, isDraw: true}, nil
	}

	return &Status{boardState: STATE_RUNNING}, nil
}

func main() {
	// noop
}
