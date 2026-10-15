```javascript
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';

import {
  createDailyQuiz,
  getDailyQuiz,
  submitDailyQuizAnswer,
} from './dailyQuizSystem.js';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export async function handleDailyQuizInteraction(interaction) {
  try {
    // ADMIN: Open the quiz creation form
    if (interaction.isChatInputCommand() &&
        interaction.commandName === 'quizcreate') {
      if (!interaction.memberPermissions?.has(
        PermissionFlagsBits.Administrator
      )) {
        return interaction.reply({
          content: '❌ Only administrators can create daily quizzes.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('dq:create-modal')
        .setTitle('Create Daily Quiz');

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
    }

    // ADMIN: Process the creation form
    if (interaction.isModalSubmit() &&
        interaction.customId === 'dq:create-modal') {
      if (!interaction.memberPermissions?.has(
        PermissionFlagsBits.Administrator
      )) {
        return interaction.reply({
          content: '❌ Only administrators can publish quizzes.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const question = interaction.fields.getTextInputValue('question').trim();

      const answers = interaction.fields
        .getTextInputValue('answers')
        .split('\n')
        .map(answer => answer.trim())
        .filter(Boolean);

      const correctLetter = interaction.fields
        .getTextInputValue('correct')
        .trim()
        .toUpperCase();

      const explanation =
        interaction.fields.getTextInputValue('explanation')?.trim() ?? '';

      if (answers.length !== 4) {
        return interaction.reply({
          content: '❌ Enter exactly four answers, one per line.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const correctAnswer = ['A', 'B', 'C', 'D'].indexOf(correctLetter);

      if (correctAnswer === -1) {
        return interaction.reply({
          content: '❌ The correct answer must be A, B, C, or D.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const quiz = await createDailyQuiz({
        quizDate: getToday(),
        question,
        answers,
        correctAnswer,
        explanation,
        createdBy: interaction.user.id,
      });

      const preview = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('📝 Daily Quiz Preview')
        .setDescription(question)
        .addFields(
          {
            name: 'Answers',
            value: answers.map((answer, index) =>
              `${String.fromCharCode(65 + index)}. ${answer}`
            ).join('\n'),
          },
          {
            name: 'Correct answer',
            value: `${correctLetter}. ${answers[correctAnswer]}`,
          }
        )
        .setFooter({ text: 'Published for today' });

      return interaction.reply({
        embeds: [preview],
        content: '✅ Your daily quiz has been published!',
        flags: MessageFlags.Ephemeral,
      });
    }

    // MEMBER: Answer a quiz
    if (interaction.isButton() &&
        interaction.customId.startsWith('dq:answer:')) {
      const parts = interaction.customId.split(':');
      const quizDate = parts[2];
      const selectedAnswer = Number(parts[3]);

      if (!quizDate || !Number.isInteger(selectedAnswer) ||
          selectedAnswer < 0 || selectedAnswer > 3) {
        return interaction.reply({
          content: '❌ This quiz button is invalid.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const result = await submitDailyQuizAnswer({
        quizDate,
        userId: interaction.user.id,
        selectedAnswer,
      });

      if (result.alreadyAttempted) {
        return interaction.reply({
          content: '⏳ You have already answered this daily quiz!',
          flags: MessageFlags.Ephemeral,
        });
      }

      return interaction.reply({
        content: result.isCorrect
          ? `✅ Correct! ${result.explanation || ''}`
          : `❌ Not quite! The correct answer is ${
              String.fromCharCode(65 + result.correctAnswer)
            }. ${result.explanation || ''}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    console.error('Daily Quiz interaction error:', error);

    const response = {
      content: '❌ Something went wrong with the Daily Quiz. Please try again.',
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.replied || interaction.deferred) {
      return interaction.followUp(response);
    }

    if (interaction.isRepliable()) {
      return interaction.reply(response);
    }
  }
}
```
