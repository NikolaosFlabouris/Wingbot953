import { sendChatMessage, Wingbot953Message } from "../MessageHandling";
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage";

export function SecondsToDuration(numIn: number) {
  const d = Math.floor(numIn / 60 / 60 / 24);
  const h = Math.floor((numIn % (60 * 60 * 24)) / 60 / 60);
  const m = Math.floor((numIn % (60 * 60)) / 60);
  const s = Math.floor((numIn % (60 * 60)) % 60);

  let result = `${h}hrs ${("0" + m).slice(-2)}mins ${("0" + s).slice(-2)}secs`;

  if (d > 0) {
    result = `${d}days ` + result;
  }

  return result;
}

///
/// Await sleep(milliseconds) to wait for the given amount of time.
///
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

///
/// Randomly returns a number between the two given numbers (inclusive)
///
export function Between(min: number, max: number) {
  if (min > max) {
    // swapping
    // min = (initial_min - initial_max)
    min = min - max;
    // b = (initial_min - initial_b) + initial_max = initial_min
    max = min + max;
    // a = initial_min - (initial_min - initial_max) = initial_max
    min = max - min;
  }

  return Math.floor(Math.random() * (max - min + 1) + min);
}

///
/// Selects a random item from the list or the specified item
/// at the human-readable index given as an argument.
///
export function SelectFromList(list: Array<string>, msg: UnifiedChatMessage) {
  const originalMessage = msg.message.text;
  const argumentCount = originalMessage.split(" ").length - 1;
  let index = Between(0, list.length - 1);

  const itemFromListMessage = structuredClone(Wingbot953Message);
  itemFromListMessage.platform = msg.platform;

  if (argumentCount === 0) {
    itemFromListMessage.message.text = `[${index + 1}] ` + list[index];
  } else if (
    argumentCount === 1 &&
    !Number.isNaN(parseInt(originalMessage.split(" ")[1].trim(), 10))
  ) {
    // Parse the number, subtract one because human readable argument is accepted.
    index = parseInt(originalMessage.split(" ")[1].trim(), 10) - 1;

    if (index < 0 || index >= list.length) {
      itemFromListMessage.message.text = `Value out of range: 1 to ${list.length}`;
    } else {
      itemFromListMessage.message.text = `[${index + 1}] ` + list[index];
    }
  } else if (argumentCount >= 1) {
    // Check if words have been given and match a quote in the list.
    const matchWords = originalMessage.split(" ").slice(1);

    const matches: Array<{ quote: string; index: number }> = [];

    for (let i = 0; i < list.length; i++) {
      let isMatch = true;
      for (let j = 0; j < matchWords.length; j++) {
        if (
          !list[i].toLowerCase().includes(matchWords[j].trim().toLowerCase())
        ) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        matches.push({ quote: list[i], index: i });
      }
    }

    if (matches.length === 0) {
      itemFromListMessage.message.text = `No word match found.`;
    } else {
      const matchIndex = Between(0, matches.length - 1);
      itemFromListMessage.message.text =
        `[${matches[matchIndex].index + 1}] ` + matches[matchIndex].quote;
    }
  }

  sendChatMessage(itemFromListMessage);
}

export function numberToOrdinal(num: number): string {
  // Handle special cases for 11th, 12th, 13th
  const lastTwoDigits = num % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${num}th`;
  }

  // Handle general cases based on last digit
  const lastDigit = num % 10;
  switch (lastDigit) {
    case 1:
      return `${num}st`;
    case 2:
      return `${num}nd`;
    case 3:
      return `${num}rd`;
    default:
      return `${num}th`;
  }
}

///
/// adiuahfiudhfusdhfisdfghoishoi
///
export function GenerateSeanMessage() {
  const letters = ["a", "b", "c", "d", "e", "f", "g", "h", "r", "s", "w"];

  const messageLength = Between(6, 14);
  let message = "asd";

  for (let i = 0; i < messageLength; i++) {
    message += letters[Between(0, letters.length - 1)];
  }

  return message;
}
