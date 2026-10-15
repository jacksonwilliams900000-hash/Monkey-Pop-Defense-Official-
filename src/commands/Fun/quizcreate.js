```javascript
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('quizcreate')
    .setDescription('Open the Daily Quiz creation GUI.')
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ),

  category: 'fun',
  slashOnly: true,

  async execute(interaction) {
    if (
      !interaction.memberPermissions?.has(
        PermissionFlagsBits.Administrator
      )
    ) {
      return interaction.reply({
        content: '❌ Only administrators can create daily quizzes.',
        ephemeral: true,
      });
    }

    const modal = new (await import('discord.js')).ModalBuilder()
      .setCustomId('dq:create-modal')
      .setTitle('Create Daily Quiz');

    const {
      ActionRowBuilder,
      TextInputBuilder,
      TextInputStyle,
    } = await import('discord.js');

    const question = new TextInputBuilder()
      .setCustomId('question')
      .setLabel('Quiz question')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setRequired(true);

    const answers = new TextInputBuilder()
      .setCustomId('answers')
      .setLabel('Four answers, one per line')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Answer A\nAnswer B\nAnswer C\nAnswer D')
      .setMaxLength(1000)
      .setRequired(true);

    const correct = new TextInputBuilder()
      .setCustomId('correct')
      .setLabel('Correct answer: A, B, C, or D')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(1)
      .setRequired(true);

    const explanation = new TextInputBuilder()
      .setCustomId('explanation')
      .setLabel('Explanation (optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(question),
      new ActionRowBuilder().addComponents(answers),
      new ActionRowBuilder().addComponents(correct),
      new ActionRowBuilder().addComponents(explanation)
    );

    return interaction.showModal(modal);
  },
};
```
