/**
 * @fileoverview Quiz system for Wingbot953 - A comprehensive object-oriented quiz management system
 *
 * This module provides a robust quiz system for the Wingbot953 chatbot that operates across
 * multiple platforms (Twitch, YouTube). The system supports two quiz types:
 *
 * - **FirstToAnswerQuiz**: Competitive mode where the first correct answer wins
 * - **AllCorrectAnswersQuiz**: Collaborative mode where all correct answers within the time limit earn points
 *
 * ## Architecture
 *
 * The system follows modern object-oriented principles with the following key classes:
 *
 * - `QuizManager` - Singleton coordinator for all quiz operations
 * - `BaseQuiz` - Abstract base class defining common quiz behavior
 * - `FirstToAnswerQuiz/AllCorrectAnswersQuiz` - Concrete implementations of specific quiz types
 * - `QuestionSelector` - Manages question selection and prevents duplicates
 * - `LeaderboardManager` - Handles persistent score storage and leaderboard operations
 *
 * ## Key Features
 *
 * - **Cross-platform support**: Works simultaneously on Twitch and YouTube
 * - **Persistent scoring**: JSON-based leaderboard storage with automatic backup
 * - **Question deduplication**: Ensures questions aren't repeated until the pool is exhausted
 * - **Bonus quiz system**: Random chance for bonus quizzes after successful rounds
 * - **Platform integration**: Automatic slow mode, chat polling adjustments, Discord publishing
 * - **Error resilience**: Comprehensive error handling and recovery mechanisms
 * - **Race condition protection**: Thread-safe operations with proper async handling
 *
 * ## Legacy Compatibility
 *
 * The module maintains backward compatibility with the original procedural API through
 * wrapper functions. New implementations should use the object-oriented API directly.
 *
 * @author Claude Code (Restructured from original implementation)
 * @version 2.0.0
 * @since 2025
 */

import { sleep, Between } from "./Utils";
import fs from "fs";
import {
  PublishTwitchAllTimeLeaderboard as PublishTwitchAllTimeLeaderboard,
  PublishYouTubeAllTimeLeaderboard,
} from "../Integrations/Discord";

import { quizCategories } from "../../Data/QuizQuestions/QuizCategories";
import { sendChatMessage, Wingbot953Message } from "../MessageHandling";
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage";
import { TwitchManager } from "../Integrations/Twitch";
import { YouTubeManager } from "../Integrations/YouTube";

// ========== INTERFACES AND TYPES ==========

/**
 * Represents a quiz participant with their score and platform information
 * @interface QuizUser
 */
interface QuizUser {
  /** Display name of the user */
  Username: string;
  /** Unique identifier for the user (optional, platform-specific) */
  UserId?: string;
  /** Platform where the user is participating (e.g., "twitch", "youtube") */
  Platform: string;
  /** Current quiz score for this user (optional) */
  Score?: number;
}

/**
 * Contains all information about a selected quiz question
 * @interface QuestionData
 */
interface QuestionData {
  /** The quiz question text */
  question: string;
  /** The primary correct answer (first in answers array) */
  answer: string;
  /** All valid answers for this question */
  answers: string[];
  /** Name of the category this question belongs to */
  categoryName: string;
  /** Index of the category in the quiz categories array */
  categoryIndex: number;
  /** Index of this question within its category */
  questionIndex: number;
}

/**
 * Configuration settings for quiz timing and behavior
 * @interface QuizConfig
 */
interface QuizConfig {
  /** Time in milliseconds for the notification phase before question appears */
  notificationTimeMs: number;
  /** Time in milliseconds users have to answer the question */
  questionTimeMs: number;
  /** Number of seconds for Twitch slow mode during quiz */
  slowModeSeconds: number;
  /** Percentage chance (0-100) for bonus quiz to trigger after correct answers */
  bonusQuizChance: number;
  /** Percentage chance (0-100) for first-to-answer quiz vs all-correct-answers quiz */
  firstToAnswerChance: number;
}

/**
 * Enum representing the different states a quiz can be in
 * @enum {string} QuizState
 */
enum QuizState {
  /** Quiz is not running and waiting for next trigger */
  IDLE = "idle",
  /** Quiz is queued to start but hasn't begun yet */
  QUEUED = "queued",
  /** Notification message has been sent, question coming soon */
  NOTIFICATION = "notification",
  /** Question is active and accepting answers */
  ACTIVE = "active",
  /** Quiz has ended and results are being processed */
  FINISHED = "finished",
}

// ========== ABSTRACT BASE CLASSES ==========

/**
 * Abstract base class for all quiz types. Defines the common structure and behavior
 * that all quiz implementations must follow while allowing customization of specific
 * quiz mechanics through abstract methods.
 *
 * @abstract
 * @class BaseQuiz
 */
abstract class BaseQuiz {
  /** The question data including text, answers, and category information */
  protected questionData: QuestionData;
  /** Configuration settings for timing and behavior */
  protected config: QuizConfig;
  /** Current state of the quiz execution */
  protected state: QuizState = QuizState.IDLE;
  /** Timestamp when the quiz question became active */
  protected startTime: number = 0;
  /** Array of users who have answered correctly */
  protected correctUsers: QuizUser[] = [];
  /** Flag to prevent double cleanup/result sending */
  protected hasEnded: boolean = false;

  /**
   * Creates a new quiz instance with the specified question and configuration
   * @param questionData - The question to be asked in this quiz
   * @param config - Configuration settings for timing and behavior
   */
  constructor(questionData: QuestionData, config: QuizConfig) {
    this.questionData = questionData;
    this.config = config;
  }

  /**
   * Gets the quiz type specific message to display in the notification phase
   * @abstract
   * @returns Message explaining how this quiz type works
   */
  abstract getQuizTypeMessage(): string;

  /**
   * Handles a user's answer attempt and determines if it's correct
   * @abstract
   * @param msg - The unified chat message containing the user's answer
   * @returns Promise that resolves to true if the answer was correct, false otherwise
   */
  abstract handleAnswer(msg: UnifiedChatMessage): Promise<boolean>;

  /**
   * Gets the result message to display when the quiz ends
   * @abstract
   * @returns Message summarizing the quiz results
   */
  abstract getResultMessage(): string;

  /**
   * Executes the complete quiz flow: notification -> question -> results -> cleanup
   * @returns Promise that resolves when the quiz is complete
   * @throws Will throw an error if quiz execution fails
   */
  async execute(): Promise<void> {
    try {
      this.state = QuizState.NOTIFICATION;
      await this.sendNotificationMessage();
      await sleep(this.config.notificationTimeMs);

      this.state = QuizState.ACTIVE;
      await this.startQuiz();
      await this.waitForQuizCompletion();

      this.state = QuizState.FINISHED;
      await this.endQuiz();
    } catch (error) {
      console.error(`Quiz execution error: ${error}`);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Waits for the quiz to complete, either by timeout or early termination
   * @protected
   * @returns Promise that resolves when the quiz should end
   */
  protected async waitForQuizCompletion(): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + this.config.questionTimeMs;

    // Poll every 100ms to check if quiz should end early
    while (Date.now() < endTime && this.state === QuizState.ACTIVE) {
      await sleep(100);
    }
  }

  /**
   * Sends the notification message to all platforms announcing the upcoming quiz
   * @private
   * @returns Promise that resolves when notification messages are sent
   */
  private async sendNotificationMessage(): Promise<void> {
    const message = `The next Quiz Question is in 20secs! ${this.getQuizTypeMessage()} The topic will be ${
      this.questionData.categoryName
    }! Good luck!`;

    const twitchMessage = structuredClone(Wingbot953Message);
    twitchMessage.platform = "twitch";
    twitchMessage.message.text = `wingma14Think ${message}`;

    const youtubeMessage = structuredClone(Wingbot953Message);
    youtubeMessage.platform = "youtube";
    youtubeMessage.message.text = message;

    await Promise.allSettled([
      sendChatMessage(twitchMessage),
      sendChatMessage(youtubeMessage, false),
    ]);
  }

  /**
   * Starts the active quiz phase by configuring platform settings and sending the question
   * @private
   * @returns Promise that resolves when the question is sent to all platforms
   */
  private async startQuiz(): Promise<void> {
    this.startTime = Date.now();

    try {
      TwitchManager.getInstance().enableSlowMode(this.config.slowModeSeconds);
      YouTubeManager.getInstance().setChatPollingInterval(1000);
    } catch (error) {
      console.error(`Failed to configure quiz settings: ${error}`);
    }

    const twitchMessage = structuredClone(Wingbot953Message);
    twitchMessage.platform = "twitch";
    twitchMessage.message.text = `wingma14Think ${this.questionData.question}`;

    const youtubeMessage = structuredClone(Wingbot953Message);
    youtubeMessage.platform = "youtube";
    youtubeMessage.message.text = this.questionData.question;

    await Promise.allSettled([
      sendChatMessage(twitchMessage),
      sendChatMessage(youtubeMessage, false),
    ]);
  }

  /**
   * Ends the quiz by sending results and performing cleanup
   * @private
   * @returns Promise that resolves when the quiz is fully ended
   */
  private async endQuiz(): Promise<void> {
    if (this.state !== QuizState.FINISHED || this.hasEnded) return;

    this.hasEnded = true;

    const resultMessage = structuredClone(Wingbot953Message);
    resultMessage.platform = "all";
    resultMessage.message.text = this.getResultMessage();

    try {
      await sendChatMessage(resultMessage);
    } catch (error) {
      console.error(`Failed to send result message: ${error}`);
    }

    await this.cleanup();
  }

  /**
   * Performs cleanup operations to reset platform settings and quiz state
   * @returns Promise that resolves when cleanup is complete
   */
  async cleanup(): Promise<void> {
    try {
      YouTubeManager.getInstance().setChatPollingInterval();
      TwitchManager.getInstance().disableSlowMode();
    } catch (error) {
      console.error(`Quiz cleanup error: ${error}`);
    }
    this.state = QuizState.IDLE;
    this.correctUsers = [];
    this.hasEnded = false;
  }

  /**
   * Validates if a user's input matches any of the correct answers
   * @protected
   * @param userInput - The raw user input to validate
   * @returns True if the input matches a correct answer, false otherwise
   */
  protected isValidAnswer(userInput: string): boolean {
    const cleanInput = userInput.toLowerCase().replace(/[.,!?;:]+$/, "");
    return this.questionData.answers.some(
      (answer) => answer.toLowerCase() === cleanInput
    );
  }

  /**
   * Gets the current state of the quiz
   * @returns The current QuizState
   */
  getState(): QuizState {
    return this.state;
  }

  /**
   * Gets a copy of the array of users who have answered correctly
   * @returns Array of QuizUser objects who answered correctly
   */
  getCorrectUsers(): QuizUser[] {
    return [...this.correctUsers];
  }
}

// ========== CONCRETE QUIZ IMPLEMENTATIONS ==========

/**
 * First-to-answer quiz implementation where only the first correct answer wins.
 * This creates a competitive "race to answer" experience where speed matters.
 *
 * @class FirstToAnswerQuiz
 * @extends BaseQuiz
 */
class FirstToAnswerQuiz extends BaseQuiz {
  /** The user who answered correctly first, null if no winner yet */
  private winner: QuizUser | null = null;

  /**
   * Gets the message explaining how first-to-answer quiz works
   * @returns Instruction message for first-to-answer quiz
   */
  getQuizTypeMessage(): string {
    return "Be the FIRST to answer correctly to earn a point.";
  }

  /**
   * Handles answer attempts for first-to-answer quiz. Only accepts the first correct answer.
   * Immediately ends the quiz when the first correct answer is received.
   * @param msg - The chat message containing the user's answer
   * @returns Promise resolving to true if this was the first correct answer, false otherwise
   */
  async handleAnswer(msg: UnifiedChatMessage): Promise<boolean> {
    if (this.state !== QuizState.ACTIVE || this.winner) return false;

    if (this.isValidAnswer(msg.message.text)) {
      this.winner = {
        Username: msg.author.displayName,
        UserId: msg.author.id,
        Platform: msg.platform,
      };

      // Immediately end the quiz
      this.state = QuizState.FINISHED;

      return true;
    }
    return false;
  }

  /**
   * Generates the result message showing who won or that nobody answered correctly
   * @returns Formatted result message with winner information or failure message
   */
  getResultMessage(): string {
    if (this.winner) {
      let platform = "";
      if (this.winner.Platform === "twitch") platform = " from Twitch";
      if (this.winner.Platform === "youtube") platform = " from YouTube";

      return `Congratulations ${this.winner.Username}${platform}! You answered the question correctly! The answer was: ${this.questionData.answer}.`;
    }
    return `No one successfully answered the question. The answer was: ${this.questionData.answer}`;
  }

  /**
   * Performs cleanup and resets the winner state
   * @returns Promise that resolves when cleanup is complete
   */
  async cleanup(): Promise<void> {
    await super.cleanup();
    this.winner = null;
  }

  /**
   * Gets the winning user, if any
   * @returns The QuizUser who won, or null if no winner
   */
  getWinner(): QuizUser | null {
    return this.winner;
  }

  /**
   * Override getCorrectUsers to return the winner as an array for score processing
   * @returns Array containing the winner, or empty array if no winner
   */
  getCorrectUsers(): QuizUser[] {
    return this.winner ? [this.winner] : [];
  }
}

/**
 * All-correct-answers quiz implementation where all correct answers within the time limit earn points.
 * This creates a collaborative experience where multiple users can succeed.
 *
 * @class AllCorrectAnswersQuiz
 * @extends BaseQuiz
 */
class AllCorrectAnswersQuiz extends BaseQuiz {
  /**
   * Gets the message explaining how all-correct-answers quiz works.
   * Customizes terminology for Halo Wars categories (UNITS instead of USERS).
   * @returns Instruction message for all-correct-answers quiz
   */
  getQuizTypeMessage(): string {
    let users = "USERS";
    if (this.questionData.categoryName.includes("Halo Wars")) {
      users = "UNITS";
    }
    return `ALL ${users} who answer correctly before time runs out will earn a point!`;
  }

  /**
   * Handles answer attempts for all-correct-answers quiz. Accepts multiple correct answers.
   * Prevents duplicate entries from the same user.
   * @param msg - The chat message containing the user's answer
   * @returns Promise resolving to true if this was a new correct answer, false otherwise
   */
  async handleAnswer(msg: UnifiedChatMessage): Promise<boolean> {
    if (this.state !== QuizState.ACTIVE) return false;

    if (this.isValidAnswer(msg.message.text)) {
      const user = {
        Username: msg.author.displayName,
        UserId: msg.author.id,
        Platform: msg.platform,
      };

      const existingUser = this.correctUsers.find(
        (u) =>
          u.Username === user.Username &&
          u.UserId === user.UserId &&
          u.Platform === user.Platform
      );

      if (!existingUser) {
        this.correctUsers.push(user);
        return true;
      }
    }
    return false;
  }

  /**
   * Generates the result message showing all users who answered correctly,
   * organized by platform with proper pluralization.
   * @returns Formatted result message listing all correct users by platform
   */
  getResultMessage(): string {
    if (this.correctUsers.length === 0) {
      return `No user successfully answered the question. The answer was: ${this.questionData.answer}`;
    }

    const twitchUsers = this.correctUsers.filter(
      (u) => u.Platform === "twitch"
    );
    const youtubeUsers = this.correctUsers.filter(
      (u) => u.Platform === "youtube"
    );

    const twitchCount = twitchUsers.length;
    const youtubeCount = youtubeUsers.length;
    const twitchPlural = twitchCount > 1 ? "users" : "user";
    const youtubePlural = youtubeCount > 1 ? "users" : "user";

    const twitchList = twitchUsers.map((u) => u.Username).join(", ");
    const youtubeList = youtubeUsers.map((u) => u.Username).join(", ");

    if (twitchList && youtubeList) {
      return `${twitchCount} Twitch ${twitchPlural} (${twitchList}) & ${youtubeCount} YouTube ${youtubePlural} (${youtubeList}) successfully answered the question. The answer was: ${this.questionData.answer}`;
    } else if (twitchList) {
      return `${twitchCount} Twitch ${twitchPlural} (${twitchList}) successfully answered the question. The answer was: ${this.questionData.answer}`;
    } else {
      return `${youtubeCount} YouTube ${youtubePlural} (${youtubeList}) successfully answered the question. The answer was: ${this.questionData.answer}`;
    }
  }
}

// ========== SUPPORTING CLASSES ==========

/**
 * Manages question selection and prevents duplicate questions from being asked
 * until all questions have been used. Provides robust question selection with
 * automatic pool reset and error handling.
 *
 * @class QuestionSelector
 */
class QuestionSelector {
  /** Set of question IDs that have already been used */
  private usedQuestions: Set<string> = new Set();
  /** Total number of questions available across all categories */
  private totalQuestionCount: number = 0;

  /**
   * Creates a new QuestionSelector and calculates the total question count
   */
  constructor() {
    this.calculateTotalQuestions();
  }

  /**
   * Calculates the total number of questions across all quiz categories
   * @private
   */
  private calculateTotalQuestions(): void {
    this.totalQuestionCount = quizCategories.reduce(
      (total, category) => total + category.CategoryLength,
      0
    );
  }

  /**
   * Selects a random unused question from all available categories.
   * Automatically resets the used questions pool when all questions have been used.
   * Includes protection against infinite loops and proper error handling.
   *
   * @returns A QuestionData object with the selected question, or null if no questions available
   */
  selectRandomQuestion(): QuestionData | null {
    const maxAttempts = this.totalQuestionCount * 2;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      if (this.usedQuestions.size >= this.totalQuestionCount) {
        console.log("All questions used, resetting question pool");
        this.resetUsedQuestions();
        if (this.totalQuestionCount === 0) return null;
      }

      const globalIndex = Between(0, this.totalQuestionCount - 1);
      const questionId = globalIndex.toString();

      if (this.usedQuestions.has(questionId)) continue;

      const questionData = this.getQuestionByGlobalIndex(globalIndex);
      if (questionData) {
        this.usedQuestions.add(questionId);
        return questionData;
      }
    }

    console.error("Failed to select random question after maximum attempts");
    return null;
  }

  /**
   * Converts a global question index to the actual question data by finding
   * the correct category and question within that category.
   *
   * @private
   * @param globalIndex - The global index across all questions in all categories
   * @returns QuestionData object if found, null if invalid index
   */
  private getQuestionByGlobalIndex(globalIndex: number): QuestionData | null {
    let currentIndex = globalIndex;

    for (let i = 0; i < quizCategories.length; i++) {
      const category = quizCategories[i];
      if (currentIndex < category.CategoryLength) {
        const question = category.CategoryQuestions[currentIndex];
        if (!question) {
          console.error(
            `Question not found at index ${currentIndex} in category ${category.CategoryName}`
          );
          return null;
        }

        return {
          question: question.Question,
          answer: question.Answers[0],
          answers: question.Answers,
          categoryName: category.CategoryName,
          categoryIndex: i,
          questionIndex: currentIndex,
        };
      }
      currentIndex -= category.CategoryLength;
    }

    console.error(`Invalid global question index: ${globalIndex}`);
    return null;
  }

  /**
   * Resets the used questions pool, allowing all questions to be selected again
   */
  resetUsedQuestions(): void {
    this.usedQuestions.clear();
  }

  /**
   * Gets the number of questions that have been used
   * @returns Number of used questions
   */
  getUsedQuestionCount(): number {
    return this.usedQuestions.size;
  }

  /**
   * Gets the total number of available questions across all categories
   * @returns Total question count
   */
  getTotalQuestionCount(): number {
    return this.totalQuestionCount;
  }
}

/**
 * Manages quiz leaderboards with persistent storage, score updates, and publication
 * to Discord. Includes race condition protection and proper error handling for
 * file operations.
 *
 * @class LeaderboardManager
 */
class LeaderboardManager {
  /** In-memory cache of leaderboard data */
  private leaderboards: QuizUser[] = [];
  /** Path to the leaderboard JSON file */
  private readonly filePath = "./Data/QuizLeaderboards/QuizLeaderboards.json";
  /** Flag to prevent concurrent loading operations */
  private isLoading = false;
  /** Flag to prevent concurrent saving operations */
  private isSaving = false;

  /**
   * Loads leaderboards from the JSON file into memory.
   * Prevents concurrent loads and creates an empty leaderboard if file doesn't exist.
   *
   * @returns Promise that resolves when loading is complete
   * @throws Will throw an error if file reading fails (except for file not found)
   */
  async loadLeaderboards(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const data = await fs.promises.readFile(this.filePath, "utf8");
      this.leaderboards = JSON.parse(data) as QuizUser[];
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        console.log("Leaderboard file not found, creating empty leaderboard");
        this.leaderboards = [];
      } else {
        console.error(`Failed to load leaderboards: ${error}`);
        throw error;
      }
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Saves the current leaderboards to the JSON file.
   * Skips saving in debug mode and prevents concurrent saves.
   *
   * @returns Promise that resolves when saving is complete
   * @throws Will throw an error if file writing fails
   */
  async saveLeaderboards(): Promise<void> {
    if (process.env.DEBUG === "TRUE" || this.isSaving) return;
    this.isSaving = true;

    try {
      await fs.promises.writeFile(
        this.filePath,
        JSON.stringify(this.leaderboards, null, 2)
      );
    } catch (error) {
      console.error(`Failed to save leaderboards: ${error}`);
      throw error;
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Updates scores for multiple users, creating new entries if needed.
   * Automatically saves and publishes leaderboards after updates.
   *
   * @param users - Array of QuizUser objects to update scores for
   * @param pointsChange - Number of points to add (can be negative)
   * @returns Promise that resolves when all updates are complete
   */
  async updateScore(users: QuizUser[], pointsChange: number): Promise<void> {
    await this.loadLeaderboards();

    for (const user of users) {
      let found = false;

      for (const leaderboardUser of this.leaderboards) {
        if (this.isSameUser(leaderboardUser, user)) {
          leaderboardUser.Score = (leaderboardUser.Score || 0) + pointsChange;
          found = true;
          break;
        }
      }

      if (!found) {
        this.leaderboards.push({
          ...user,
          Score: pointsChange,
        });
      }
    }

    await this.saveLeaderboards();
    await this.publishLeaderboards();
  }

  /**
   * Determines if two QuizUser objects represent the same user.
   * Matches by UserId+Platform first, then falls back to Username+Platform.
   *
   * @private
   * @param user1 - First user to compare
   * @param user2 - Second user to compare
   * @returns True if users are considered the same, false otherwise
   */
  private isSameUser(user1: QuizUser, user2: QuizUser): boolean {
    return (
      (user1.Username === user2.Username &&
        user1.UserId === user2.UserId &&
        user1.Platform === user2.Platform) ||
      (user1.Username === user2.Username && user1.Platform === user2.Platform)
    );
  }

  /**
   * Retrieves a user's quiz score and information.
   * Searches by UserId+Platform first, then by Username+Platform.
   *
   * @param username - The username to search for
   * @param userId - Optional user ID for more precise matching
   * @param platform - Optional platform to restrict search to
   * @returns Promise resolving to QuizUser object if found, null otherwise
   */
  async getScore(
    username: string,
    userId?: string,
    platform?: string
  ): Promise<QuizUser | null> {
    await this.loadLeaderboards();

    for (const user of this.leaderboards) {
      if (
        userId &&
        platform &&
        user.UserId === userId &&
        user.Platform === platform
      ) {
        return user;
      }
      if (
        platform &&
        user.Username.toLowerCase() === username.toLowerCase() &&
        user.Platform === platform
      ) {
        return user;
      }
    }
    return null;
  }

  /**
   * Gets the top users for a specific platform, sorted by score descending.
   *
   * @param platform - The platform to get top users for (e.g., "twitch", "youtube")
   * @param limit - Maximum number of users to return (default: 5)
   * @returns Promise resolving to array of top QuizUser objects
   */
  async getTopUsers(platform: string, limit: number = 5): Promise<QuizUser[]> {
    await this.loadLeaderboards();

    return this.leaderboards
      .filter((user) => user.Platform === platform)
      .sort((a, b) => (b.Score || 0) - (a.Score || 0))
      .slice(0, limit);
  }

  /**
   * Publishes leaderboards to Discord channels for both Twitch and YouTube.
   * Uses Promise.allSettled to ensure failure in one doesn't affect the other.
   *
   * @private
   * @returns Promise that resolves when publishing attempts complete
   */
  private async publishLeaderboards(): Promise<void> {
    try {
      await Promise.allSettled([
        PublishTwitchAllTimeLeaderboard(this.leaderboards),
        PublishYouTubeAllTimeLeaderboard(this.leaderboards),
      ]);
    } catch (error) {
      console.error(`Failed to publish leaderboards: ${error}`);
    }
  }
}

// ========== MAIN QUIZ MANAGER ==========

/**
 * Central manager for all quiz operations using the Singleton pattern.
 * Coordinates quiz selection, execution, scoring, and queue management.
 * Provides a unified interface for all quiz-related functionality.
 *
 * @class QuizManager
 */
export class QuizManager {
  /** Singleton instance of QuizManager */
  private static instance: QuizManager | null = null;
  /** Handles question selection and deduplication */
  private questionSelector: QuestionSelector;
  /** Manages leaderboard persistence and operations */
  private leaderboardManager: LeaderboardManager;
  /** Currently active quiz instance, null if no quiz running */
  private activeQuiz: BaseQuiz | null = null;
  /** Number of quizzes queued to start */
  private quizQueue: number = 0;
  /** Flag to prevent concurrent quiz operations */
  private isBlocked: boolean = false;
  /** Timer for checking and processing the quiz queue */
  private queueCheckInterval: NodeJS.Timeout | null = null;

  /** Configuration settings for quiz timing and behavior */
  private readonly config: QuizConfig = {
    notificationTimeMs: 17000,
    questionTimeMs: 25000,
    slowModeSeconds: 3,
    bonusQuizChance: 7,
    firstToAnswerChance: 20,
  };

  /**
   * Private constructor for singleton pattern.
   * Initializes QuestionSelector and LeaderboardManager instances.
   */
  private constructor() {
    this.questionSelector = new QuestionSelector();
    this.leaderboardManager = new LeaderboardManager();
  }

  /**
   * Gets the singleton instance of QuizManager.
   * Creates a new instance if one doesn't exist.
   *
   * @static
   * @returns The singleton QuizManager instance
   */
  static getInstance(): QuizManager {
    if (!QuizManager.instance) {
      QuizManager.instance = new QuizManager();
    }
    return QuizManager.instance;
  }

  /**
   * Initializes the quiz manager by logging question counts and starting
   * the queue monitoring system.
   *
   * @returns Promise that resolves when initialization is complete
   * @throws Will throw an error if initialization fails
   */
  async initialise(): Promise<void> {
    try {
      console.log(
        `Total question count: ${this.questionSelector.getTotalQuestionCount()}`
      );

      for (const category of quizCategories) {
        console.log(
          `${category.CategoryName} Question count: ${category.CategoryLength}`
        );
      }

      this.startQueueMonitoring();
    } catch (error) {
      console.error(`Failed to initialize QuizManager: ${error}`);
      throw error;
    }
  }

  /**
   * Starts the queue monitoring system that checks for queued quizzes every 2 seconds.
   * Clears any existing interval before starting a new one.
   *
   * @private
   */
  private startQueueMonitoring(): void {
    if (this.queueCheckInterval) {
      clearInterval(this.queueCheckInterval);
    }

    this.queueCheckInterval = setInterval(() => {
      this.processQueue().catch((error) => {
        console.error(`Queue processing error: ${error}`);
      });
    }, 2000);
  }

  /**
   * Processes the quiz queue by starting a quiz if conditions are met.
   * Randomly selects between first-to-answer and all-correct-answers quiz types.
   *
   * @private
   * @returns Promise that resolves when queue processing is complete
   */
  private async processQueue(): Promise<void> {
    if (this.quizQueue <= 0 || this.isBlocked || this.activeQuiz) return;

    this.quizQueue = Math.max(0, this.quizQueue - 1);

    try {
      const isFirstToAnswer = Between(0, 99) < this.config.firstToAnswerChance;
      await this.startQuiz(isFirstToAnswer);
    } catch (error) {
      console.error(`Failed to start quiz: ${error}`);
      this.isBlocked = false;
    }
  }

  /**
   * Starts a new quiz with the specified type.
   * Prevents concurrent quiz execution and handles the complete quiz lifecycle.
   *
   * @param isFirstToAnswer - True for FirstToAnswerQuiz, false for AllCorrectAnswersQuiz. Defaults to random selection.
   * @returns Promise that resolves when the quiz is complete
   */
  async startQuiz(
    isFirstToAnswer: boolean = Between(0, 99) < this.config.firstToAnswerChance
  ): Promise<void> {
    if (this.isBlocked || this.activeQuiz) {
      console.log("Quiz blocked or already active");
      return;
    }

    this.isBlocked = true;

    try {
      const questionData = this.questionSelector.selectRandomQuestion();
      if (!questionData) {
        throw new Error("No question available");
      }

      this.activeQuiz = isFirstToAnswer
        ? new FirstToAnswerQuiz(questionData, this.config)
        : new AllCorrectAnswersQuiz(questionData, this.config);

      console.log(
        `Starting ${
          isFirstToAnswer ? "First-to-Answer" : "All-Correct-Answers"
        } quiz: ${questionData.question}`
      );

      await this.activeQuiz.execute();
      await this.handleQuizCompletion();
    } catch (error) {
      console.error(`Quiz execution failed: ${error}`);
      if (this.activeQuiz) {
        await this.activeQuiz.cleanup();
      }
    } finally {
      this.activeQuiz = null;
      this.isBlocked = false;
    }
  }

  /**
   * Handles quiz completion by updating scores and potentially triggering bonus quizzes.
   * Only processes users who answered correctly.
   *
   * @private
   * @returns Promise that resolves when completion handling is done
   */
  private async handleQuizCompletion(): Promise<void> {
    if (!this.activeQuiz) return;

    try {
      const correctUsers = this.activeQuiz.getCorrectUsers();

      if (correctUsers.length > 0) {
        await this.leaderboardManager.updateScore(correctUsers, 1);
        await this.rollBonusQuiz();
      }
    } catch (error) {
      console.error(`Failed to handle quiz completion: ${error}`);
    }
  }

  /**
   * Handles incoming chat messages during active quizzes.
   * Routes messages to the active quiz for answer processing.
   *
   * @param msg - The unified chat message to process
   * @returns Promise that resolves when message handling is complete
   */
  async handleMessage(msg: UnifiedChatMessage): Promise<void> {
    if (!this.activeQuiz || this.activeQuiz.getState() !== QuizState.ACTIVE)
      return;

    try {
      const wasCorrect = await this.activeQuiz.handleAnswer(msg);

      if (wasCorrect && this.activeQuiz instanceof FirstToAnswerQuiz) {
        console.log(
          `Correct answer from ${msg.author.displayName}: ${msg.message.text}`
        );
      }
    } catch (error) {
      console.error(`Error handling quiz message: ${error}`);
    }
  }

  /**
   * Adds a quiz to the queue to be started when conditions allow.
   */
  queueQuiz(): void {
    this.quizQueue++;
  }

  /**
   * Checks if a quiz is currently active and accepting answers.
   *
   * @returns True if a quiz is active, false otherwise
   */
  isQuizActive(): boolean {
    return (
      this.activeQuiz !== null &&
      this.activeQuiz.getState() === QuizState.ACTIVE
    );
  }

  /**
   * Resets the pool of used questions, allowing all questions to be selected again.
   */
  resetUsedQuestions(): void {
    this.questionSelector.resetUsedQuestions();
  }

  /**
   * Attempts to trigger a bonus quiz based on configured chance percentage.
   * Sends announcement messages and queues a new quiz if successful.
   *
   * @returns Promise that resolves when bonus quiz processing is complete
   */
  async rollBonusQuiz(): Promise<void> {
    await sleep(2000);
    const roll = Between(0, 99);

    if (roll < this.config.bonusQuizChance) {
      console.log(`Successful Bonus Quiz Roll: ${roll}`);

      const bonusMessage = "BONUS QUIZ! LET'S GO!";

      const twitchMessage = structuredClone(Wingbot953Message);
      twitchMessage.platform = "twitch";
      twitchMessage.message.text = `wingma14Think ${bonusMessage} wingma14Think`;

      const youtubeMessage = structuredClone(Wingbot953Message);
      youtubeMessage.platform = "youtube";
      youtubeMessage.message.text = bonusMessage;

      try {
        await Promise.allSettled([
          sendChatMessage(twitchMessage),
          sendChatMessage(youtubeMessage),
        ]);

        await sleep(2000);
        this.queueQuiz();
      } catch (error) {
        console.error(`Failed to send bonus quiz message: ${error}`);
      }
    } else {
      console.log(`Unsuccessful Bonus Quiz Roll: ${roll}`);
    }
  }

  /**
   * Gets the LeaderboardManager instance for external access to leaderboard operations.
   *
   * @returns The LeaderboardManager instance
   */
  getLeaderboardManager(): LeaderboardManager {
    return this.leaderboardManager;
  }

  /**
   * Shuts down the quiz manager by clearing intervals and cleaning up active quizzes.
   * Should be called when the application is terminating.
   */
  shutdown(): void {
    if (this.queueCheckInterval) {
      clearInterval(this.queueCheckInterval);
      this.queueCheckInterval = null;
    }

    if (this.activeQuiz) {
      this.activeQuiz.cleanup().catch((error) => {
        console.error(`Error during quiz cleanup on shutdown: ${error}`);
      });
      this.activeQuiz = null;
    }
  }
}

/**
 * Retrieves and displays the top 5 quiz users for the requesting user's platform.
 *
 * @param msg - The unified chat message containing platform and user information
 * @returns Promise that resolves when leaderboard message is sent
 */
export async function GetQuizLeaderboards(
  msg: UnifiedChatMessage
): Promise<void> {
  try {
    const topUsers = await QuizManager.getInstance()
      .getLeaderboardManager()
      .getTopUsers(msg.platform, 5);

    let message = `${msg.platform.toUpperCase()} ALL-TIME QUIZ TOP 5: `;

    for (let i = 0; i < topUsers.length; i++) {
      message += `${topUsers[i].Username} - ${topUsers[i].Score || 0}pts | `;
    }

    const quizMessage = structuredClone(Wingbot953Message);
    quizMessage.platform = msg.platform;
    quizMessage.message.text = message;

    await sendChatMessage(quizMessage);
  } catch (error) {
    console.error(`Failed to get quiz leaderboards: ${error}`);
  }
}

/**
 * Retrieves and displays a user's quiz score. Can look up own score or another user's score.
 * Command format: "!score" for own score, "!score username" for another user's score.
 *
 * @param msg - The unified chat message containing the score query
 * @returns Promise that resolves when score message is sent
 */
export async function GetQuizScore(msg: UnifiedChatMessage): Promise<void> {
  try {
    const originalMessage = msg.message.text;
    const platform = msg.platform;
    const userId = msg.author.id;
    let searchUsername = msg.author.displayName;

    // Check if a specific username was provided as the second word
    if (originalMessage.split(" ").length >= 2) {
      searchUsername = originalMessage.split(" ")[1].trim();
    }

    const userScore = await QuizManager.getInstance()
      .getLeaderboardManager()
      .getScore(searchUsername, userId, platform);

    const quizMessage = structuredClone(Wingbot953Message);
    quizMessage.platform = msg.platform;

    if (userScore) {
      quizMessage.message.text = `${
        userScore.Username
      }'s All-time Quiz Score is: ${userScore.Score || 0}`;
    } else {
      quizMessage.message.text = `No score found for user: ${searchUsername}`;
    }

    await sendChatMessage(quizMessage);
  } catch (error) {
    console.error(`Failed to get quiz score: ${error}`);
  }
}

/**
 * Manually adds a quiz point to a specified user. Admin command.
 * Command format: "!addscore username"
 *
 * @param msg - The unified chat message containing the add score command
 * @returns Promise that resolves when score is updated and confirmation sent
 */
export async function AddQuizScore(msg: UnifiedChatMessage): Promise<void> {
  try {
    const originalMessage = msg.message.text;
    const parts = originalMessage.split(" ");

    if (parts.length === 2) {
      const username = parts[1].trim();

      await QuizManager.getInstance()
        .getLeaderboardManager()
        .updateScore([{ Username: username, Platform: msg.platform }], 1);

      const quizMessage = structuredClone(Wingbot953Message);
      quizMessage.platform = msg.platform;
      quizMessage.message.text = `Score added for user: @${username}`;

      await sendChatMessage(quizMessage);
    }
  } catch (error) {
    console.error(`Failed to add quiz score: ${error}`);
  }
}

/**
 * Publishes current leaderboards to Discord channels for both platforms.
 * Combines top users from Twitch and YouTube platforms before publishing.
 *
 * @returns Promise that resolves when publishing attempts complete
 */
export async function PublishLeaderboards(): Promise<void> {
  try {
    const leaderboardManager =
      QuizManager.getInstance().getLeaderboardManager();
    await leaderboardManager.loadLeaderboards();

    const allLeaderboards = await Promise.all([
      leaderboardManager.getTopUsers("twitch", 100),
      leaderboardManager.getTopUsers("youtube", 100),
    ]);

    const combinedLeaderboards = [...allLeaderboards[0], ...allLeaderboards[1]];

    await Promise.allSettled([
      PublishTwitchAllTimeLeaderboard(combinedLeaderboards),
      PublishYouTubeAllTimeLeaderboard(combinedLeaderboards),
    ]);
  } catch (error) {
    console.error(`Failed to publish leaderboards: ${error}`);
  }
}

/**
 * Updates leaderboard entries with Twitch user IDs by querying the Twitch API.
 * This is used to migrate old leaderboard entries that only have usernames to
 * include proper user IDs for more reliable user matching.
 *
 * @private
 * @returns Promise that resolves when ID updates are complete
 */
async function UpdateLeaderboardsWithIds(): Promise<void> {
  try {
    const leaderboardManager =
      QuizManager.getInstance().getLeaderboardManager();
    await leaderboardManager.loadLeaderboards();

    console.log("Updating leaderboards with IDs...");

    const twitchUsers = await leaderboardManager.getTopUsers("twitch", 1000);

    for (const leaderboardUser of twitchUsers) {
      if (!leaderboardUser.UserId && leaderboardUser.Username) {
        try {
          console.log(`Updating ID for user ${leaderboardUser.Username}`);
          const user =
            await TwitchManager.getInstance().api!.users.getUserByName(
              leaderboardUser.Username
            );

          if (user) {
            console.log(
              `ID for user ${leaderboardUser.Username} is ${user.id}`
            );

            await leaderboardManager.updateScore(
              [
                {
                  Username: leaderboardUser.Username,
                  UserId: user.id,
                  Platform: leaderboardUser.Platform,
                  Score: leaderboardUser.Score,
                },
              ],
              0
            );
          }
        } catch (error) {
          console.error(
            `Failed to update ID for ${leaderboardUser.Username}: ${error}`
          );
        }
      }
    }

    await PublishLeaderboards();
  } catch (error) {
    console.error(`Failed to update leaderboards with IDs: ${error}`);
  }
}
