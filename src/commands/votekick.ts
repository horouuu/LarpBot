import {
  CacheType,
  Interaction,
  ApplicationCommandOptionType,
  MessageReaction,
  User,
  ReadonlyCollection,
  Snowflake,
} from "discord.js";
import { Command } from "@types-local/commands";
const votekick = {
  name: "votekick",
  description:
    "Starts a vote to kick a member. Requires 3 votes excluding the bot by default.",
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: "target",
      description: "Votekick target",
      required: true,
    },
  ],
  execute: async (interaction: Interaction<CacheType>) => {
    if (!interaction.isChatInputCommand()) return;
    const target = interaction.options.getUser("target");
    if (!target) {
      await interaction.reply("Missing input: target.");
      return;
    }

    try {
      const response = await interaction.reply({
        content: `Vote to kick member: ${target}?`,
        withResponse: true,
      });

      await response.resource.message.react("✅");
      await response.resource.message.react("❌");

      const filter = (reaction: MessageReaction, user: User) =>
        ["✅", "❌"].includes(reaction.emoji.name) && !user.bot;

      const reactionCollector =
        response.resource.message.createReactionCollector({
          filter: filter,
          time: 30000,
        });

      reactionCollector.on(
        "collect",
        (reaction: MessageReaction, user: User) => {
          const targetInVote = reaction.users.cache.has(target.id) ? 1 : 0;
          const total = reaction.count - 1 - targetInVote; // deduct bot and target's votes
          const type = reaction.emoji.name;
          console.log(
            `Vote against ${target} | ${type}: ${total} (+ ${user.username})`
          );
        }
      );

      reactionCollector.on("end", () => {
        response.resource.message.reply(`Vote on member ${target} expired.`);
      });
    } catch (e) {
      console.error(e);
      interaction
        .followUp(
          "Something went wrong in the background. Contact the developers for help."
        )
        .catch((e) => console.error(e));
    }
  },
} satisfies Command;

export { votekick };
