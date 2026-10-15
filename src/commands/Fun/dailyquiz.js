```javascript
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import { getDailyQuiz } from '../../utils/dailyQuizSystem.js';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default {
  data: new SlashCommandBuilder()
    .setName('dailyquiz')
    .setDescription('Play today’s daily quiz.'),

  category: 'fun',
  slashOnly: true,

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const quizDate = getToday();
      const quiz = await getDailyQuiz(quizDate);

      if (!quiz) {
        return interaction.editReply({
          content:
            '📝 There is no daily quiz published yet. Please check back later!',
        });
      }

      const answers = Array.isArray(quiz.answers)
        ? quiz.answers
        : JSON.parse(quiz.answers);

      if (answers.length !== 4) {
        return interaction.editReply({
          content: '❌ Today’s quiz is configured incorrectly.',
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🧠 Daily Quiz Challenge')
        .setDescription(
          `**${quiz.question}**\n\n` +
          answers
            .map(
              (answer, index) =>
                `**${String.fromCharCode(65 + index)}.** ${answer}`
            )
            .join('\n\n')
        )
        .addFields({
          name: '📅 Date',
          value: quizDate,
          inline: true,
        })
        .setFooter({
          text: 'Choose your answer below • One attempt per day',
        });

      const buttons = new ActionRowBuilder();

      answers.forEach((answer, index) => {
        buttons.addComponents(
          new ButtonBuilder()
            .setCustomId(`dq:answer:${quizDate}:${index}`)
            .setLabel(String.fromCharCode(65 + index))
            .setStyle(ButtonStyle.Primary)
        );
      });

      return interaction.editReply({
        embeds: [embed],
        components: [buttons],
      });
    } catch (error) {
      console.error('Daily Quiz command error:', error);

      const message =
        '❌ Something went wrong while loading today’s quiz.';

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
