import { DrawingDriver } from "./canvas";
import { Note } from "../model/note";
import * as audio from "../model/audio";

interface NoteEvent {
  noteNumber: number;
}

function playNote(e: NoteEvent, length: number) {
  audio.playNote(e.noteNumber, length);
}

interface PianoRollOptions {
  el: HTMLCanvasElement;
  notes: Note[];
  patternLength: number;
}

export class PianoRoll {
  el: HTMLCanvasElement;
  _notes: Note[];
  drv: DrawingDriver;
  hoverNote: Note | null;
  clicked: boolean;
  nowNote: number;
  startPos: number;
  playing: boolean;
  playingPos: number;
  bpm: number;

  tick() {
    if (this.playing) {
      this.playingPos++;
      this.drv.playPosition = this.playingPos;
      if (this.playingPos >= this.drv.patternLength) {
        this.playingPos = 0;
      }
      this.notes.forEach(note => {
        if (note.start === this.playingPos) {
          playNote(
            {
              noteNumber: note.no + 48
            },
            (note.length * 60000) / this.bpm / 4
          );
        }
      });
      this.draw();
    }
  }

  set notes(notes) {
    this._notes = notes;
    this.drv = new DrawingDriver(
      this.el.getContext("2d"),
      this.el.offsetWidth,
      this.el.offsetHeight
    );
    this.draw();
  }
  get notes() {
    return this._notes;
  }

  constructor(options: PianoRollOptions) {
    this.el = options.el;
    this.notes = options.notes ? options.notes : [];
    this.patternLength = options.patternLength ? options.patternLength : 32;
    this.hoverNote = null;
    this.clicked = false;
    this.nowNote = -1;
    this.playing = false;
    this.playingPos = -1;
    this.bpm = 120;
    let timebase = 60000 / this.bpm / 4;

    setInterval(() => {
      this.tick();
    }, timebase);

    this.el.addEventListener("pointermove", (e: PointerEvent) => {
      this.onMouseMove(e.offsetX, e.offsetY);
    });

    this.el.addEventListener("pointerdown", (e: PointerEvent) => {
      e.preventDefault();
      this.onMouseDown(e.offsetX, e.offsetY);
    });

    this.el.addEventListener("pointerup", (e: PointerEvent) => {
      e.preventDefault();
      this.onMouseUp(e.offsetX, e.offsetY);
    });
  }

  set patternLength(value: number) {
    if (this.drv) {
      this.drv.patternLength = value;
      this.el.width = value * 32;
      this.playingPos = 0;
      this.draw();
    }
  }

  onMouseDown(x: number, y: number) {
    var note = this.drv.createNote(1, x, y, 1);
    this.nowNote = note.no;
    this.startPos = note.start;

    // 0 = C3
    playNote(
      {
        noteNumber: note.no + 48
      },
      100
    );
    this.draw();
    this.clicked = true;
  }

  onMouseMove(x: number, y: number) {
    var note = this.drv.createNote(1, x, y, 1);
    if (this.clicked) {
      note = this.drv.createNoteWithLength(1, this.startPos, y, x);
      if (this.nowNote !== note.no) {
        playNote(
          {
            noteNumber: note.no + 48
          },
          100
        );
        this.nowNote = note.no;
      }
    }
    this.hoverNote = note;
    this.draw();
  }

  onMouseUp(x: number, y: number) {
    var note = this.drv.createNoteWithLength(1, this.startPos, y, x);
    var matched = this._hitTest(note);
    if (matched >= 0) {
      this.notes.splice(matched, 1);
    } else {
      this.notes.push(note);
    }
    this.draw();
    this.clicked = false;
  }

  _drawAllNotes() {
    this.notes.forEach((note: Note) => {
      this.drv.drawNote(note, "#d66");
    });
  }

  _drawHoverNote() {
    this.drv.drawNote(this.hoverNote, "rgba(0,0,0,0.5)");
  }

  draw() {
    this.drv.clear();
    this._drawAllNotes();
    if (this.hoverNote) {
      this._drawHoverNote();
    }
  }

  _hitTest(note: Note) {
    var matched = -1;
    for (var i = 0; i < this.notes.length; i++) {
      var n = this.notes[i];
      if (_isHit(n, note)) {
        matched = i;
      }
    }
    return matched;
  }

  play() {
    this.playing = true;
  }
  stop() {
    this.playing = false;
  }
}

function _isHit(n: Note, note: Note) {
  return (
    n.no === note.no &&
    n.start <= note.start &&
    n.start + n.length - 1 >= note.start
  );
}
