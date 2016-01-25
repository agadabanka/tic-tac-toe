package main

import (
	"testing"
)

type Out struct {
	status Status
	err    error
}

type In struct {
	state   string
	player1 string
	player2 string
	input   string
}

type InUpdateBoard struct {
	state string
	player string
	input string
}

type OutUpdateBoard struct {
	gameOver bool
	err error
	state string
}

type Case struct {
	In
	want Out
}


func TestUpdateBoard(t *testing.T) {
	cases := []struct{
		InUpdateBoard
		want OutUpdateBoard
	} {
		{InUpdateBoard{state: "", player: "am", input: "X1"}, OutUpdateBoard{state: "X1"}},		
		{InUpdateBoard{state: "X1", player: "ni", input: "Y1"}, OutUpdateBoard{state: "X1Y1"}},
	}

	b := NewBoard("am", "ni")
	for _, c := range cases {
		b.state = c.state
		got, err := b.UpdateBoard(c.player, c.input)
		if c.want.err != err {
			t.Errorf("TestUpdateBoard(%s) == %v, want: %v", c.state, err, c.want.err)
		} else if b.state != c.want.state {
			t.Errorf("TestUpdateBoard(%s) == %v, want: %v", c.state, b.state, c.want.state)
		} else if got != c.want.gameOver {
			t.Errorf("TestUpdateBoard(%s) == %v, want: %v", c.state, b.state, c.want.gameOver)
		}
	}

}

func TestCheckBoardErrors(t *testing.T) {
	cases := []Case {		
		{In{state: "X", player1: "X", player2: "Y", input: ""}, Out{status: Status{boardState: STATE_UNKNOWN}, err: ErrBoardStateLength}},		
		{In{state: "X1Y2X1", player1: "X", player2: "Y", input: ""}, Out{status: Status{boardState: STATE_UNKNOWN}, err: ErrBoardStateRepeated}},
		{In{state: "X1Y2X3X4", player1: "X", player2: "Y", input: ""}, Out{status: Status{boardState: STATE_UNKNOWN}, err: ErrBoardStatePlayer}},
		{In{state: "X1Y2X2", player1: "X", player2: "Y", input: ""}, Out{status: Status{boardState: STATE_UNKNOWN}, err: ErrBoardStateRepeated}},
		{In{state: "X1Y2X2", player1: "Y", player2: "X", input: ""}, Out{status: Status{boardState: STATE_UNKNOWN}, err: ErrBoardStatePlayer}},
	}

	test(t, cases)	
}

func TestCheckBoardCompletion(t *testing.T) {
	cases := []Case {
		{In{state: "X1Y4X2Y5X3", player1: "X", player2: "Y", input: ""}, Out{status: Status{boardState: STATE_COMPLETE, winner: "X"}}},
		{In{state: "X1Y4X2Y5X7Y6", player1: "X", player2: "Y", input: ""}, Out{status: Status{boardState: STATE_COMPLETE, winner: "Y"}}},
		{In{state: "X1Y5X2Y6X7Y4", player1: "X", player2: "Y", input: ""}, Out{status: Status{boardState: STATE_COMPLETE, winner: "Y"}}},
		{In{state: "X9Y8X5Y6X1Y4", player1: "X", player2: "Y", input: ""}, Out{status: Status{boardState: STATE_COMPLETE, winner: "X"}}},
		{In{state: "X1Y4X2Y5X7Y8X6Y3", player1: "X", player2: "Y", input: "X9"}, Out{status: Status{boardState: STATE_COMPLETE, isDraw: true}}},

	}

	test(t, cases)
}

func TestCheckBoardRunning(t *testing.T) {
	cases := []Case {
		{In{state: "", player1: "X", player2: "Y", input: ""}, Out{status: Status{boardState: STATE_EMPTY}}},		
		{In{state: "X1", player1: "X", player2: "Y", input: ""}, Out{status: Status{boardState: STATE_RUNNING}}},
		{In{state: "X1Y2", player1: "X", player2: "Y", input: ""}, Out{status: Status{boardState: STATE_RUNNING}}},		
	}

	test(t, cases)
}



func test(t *testing.T, cases []Case) {
	b := NewBoard("am", "ni")
	for _, c := range cases {
		b.state = c.state
		if got, err := b.CheckBoard(c.player1, c.player2, c.input); err != nil {
			if c.want.err != err {
				t.Errorf("RunCheckBoard(%s) == %v, want: %v", c.state, err, c.want.err)
			}
		} else if *got != c.want.status {
			t.Errorf("RunCheckBoard(%s) == %v, want: %v", c.state, *got, c.want.status)
		}
	}
}

