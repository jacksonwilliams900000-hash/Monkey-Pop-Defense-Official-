```js
import {
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';

import {
  getDailyQuizLeaderboard,
} from '../../utils/dailyQuizSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('quizleaderboard')
    .setDescription('View the Daily Quiz leaderboard.'),

  category: 'fun',
  slashOnly: true,

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const leaderboard = await getDailyQuizLeaderboard(10);

      if (!leaderboard.length) {
        return interaction.editReply({
          content: '🏆 Nobody has completed a Daily Quiz yet. Be the first!',
        });
      }

      const rankings = leaderboard.map((player, index) => {
        const rank = index + 1;
        const correct = Number(player.correct_answers);
        const attempts = Number(player.total_attempts);

        const medal =
          rank === 1 ? '🥇' :
          rank === 2 ? '🥈' :
          rank === 3 ? '🥉' :
          `**${rank}.**`;

        return `${medal} <@${player.user_id}> — **${correct}** correct answers (${attempts} attempts)`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🏆 Daily Quiz Leaderboard')
        .setDescription(rankings.join('\n'))
        .setFooter({
          text: 'Ranked by total correct answers',
        })
        .setTimestamp();

      return interaction.editReply({
        embeds: [embed],
      });
    } catch (error) {
      console.error('Error loading quiz leaderboard:', error);

      const message = '❌ Something went wrong while loading the quiz leaderboard.';

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: message,
          embeds: [],
          components: [],
        }).catch(() => {});
      }

      return interaction.reply({
        content: message,
        ephemeral: true,
      }).catch(() => {});
    }
  },
};
```
