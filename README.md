# Dr. Mario seed cracker

**[Open it here: l0laapk3.github.io/dr-mario-seed-cracker](https://l0laapk3.github.io/dr-mario-seed-cracker/)**

> This repo is fully vibecoded.

Figures out the pill queue of NES Dr. Mario from the first few pills of a level, then shows the upcoming pills.

## Usage

- Enter the pills in the order they are dealt, starting with the first pill of the level, using the numpad keys 1-9
  (each key is one color combination, shown on the on-screen numpad).
- After about 11 pills there is usually only one possible seed left and the queue is cracked. From then on any of
  1-9 or 0 advances the queue by one pill.
- Started mid-level or missed some pills? Press Enter (wildcard) first.
- Press &minus; at every new level, `.` to undo.
- The number of pills shown ahead can be set at the top.

## How it works

At the start of a level the game fills a 128-pill reserve from its 16-bit RNG. Only 2^15 reserves are possible, so
the tool generates all of them and keeps the ones (and positions in them) that match the pills entered so far.

## License

[CC BY-NC-SA 4.0](LICENSE.txt)
