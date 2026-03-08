import { EventEmitter } from "events";

/**
 * Centralized event bus for communication between integration managers
 * 
 * This singleton provides a decoupled way for different managers (Twitch, YouTube, Discord, etc.)
 * to communicate state changes without direct dependencies. Uses Node.js EventEmitter for
 * reliable event handling with proper error management.
 * 
 * @example
 * ```typescript
 * // Emit an event
 * EventBus.getInstance().emit('twitch:stream:started');
 * 
 * // Listen for events
 * EventBus.getInstance().on('twitch:stream:started', () => {
 *   console.log('Twitch stream started!');
 * });
 * ```
 */
export class EventBus extends EventEmitter {
  private static instance: EventBus;

  /**
   * Private constructor to prevent direct instantiation
   * Use getInstance() to get the singleton instance
   */
  private constructor() {
    super();
    
    // Increase max listeners to accommodate multiple managers
    this.setMaxListeners(20);
    
    // Log unhandled errors to prevent crashes
    this.on('error', (error) => {
      console.error('EventBus error:', error);
    });
  }

  /**
   * Gets the singleton instance of EventBus
   * @returns The singleton instance of EventBus
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Safely emit an event with error handling
   * Prevents uncaught exceptions from crashing the application
   * 
   * @param event The event name to emit
   * @param args Additional arguments to pass to listeners
   * @returns True if the event had listeners, false otherwise
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public safeEmit(event: string | symbol, ...args: any[]): boolean {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return this.emit(event, ...args);
    } catch (error) {
      console.error(`Error emitting event '${event.toString()}':`, error);
      return false;
    }
  }

  /**
   * Clean up all listeners and reset the instance
   * Used primarily for testing and graceful shutdown
   */
  public dispose(): void {
    this.removeAllListeners();
  }
}

/**
 * Event type definitions for type safety and documentation
 * Add new event types here as integrations expand
 */
export const EventTypes = {
  // Twitch events (polling-based)
  TWITCH_STREAM_STARTED: 'twitch:stream:started',
  TWITCH_STREAM_ENDED: 'twitch:stream:ended',

  // Twitch EventSub events
  TWITCH_EVENTSUB_STREAM_ONLINE: 'twitch:eventsub:stream:online',
  TWITCH_EVENTSUB_STREAM_OFFLINE: 'twitch:eventsub:stream:offline',
  TWITCH_CHANNEL_POINT_REDEMPTION: 'twitch:eventsub:channel_point_redemption',
  TWITCH_FOLLOW: 'twitch:eventsub:follow',
  TWITCH_HYPE_TRAIN_BEGIN: 'twitch:eventsub:hype_train:begin',
  TWITCH_HYPE_TRAIN_END: 'twitch:eventsub:hype_train:end',
  TWITCH_PREDICTION_BEGIN: 'twitch:eventsub:prediction:begin',
  TWITCH_PREDICTION_END: 'twitch:eventsub:prediction:end',
  TWITCH_POLL_BEGIN: 'twitch:eventsub:poll:begin',
  TWITCH_POLL_END: 'twitch:eventsub:poll:end',
  TWITCH_SHOUTOUT_RECEIVE: 'twitch:eventsub:shoutout:receive',

  // YouTube events (for future use)
  YOUTUBE_STREAM_STARTED: 'youtube:stream:started',
  YOUTUBE_STREAM_ENDED: 'youtube:stream:ended',

  // Discord events (for future use)
  DISCORD_CONNECTED: 'discord:connected',
  DISCORD_DISCONNECTED: 'discord:disconnected',
} as const;

/**
 * Type definition for event names to ensure type safety
 */
export type EventType = typeof EventTypes[keyof typeof EventTypes];