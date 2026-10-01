import User from './User';
import Sender from './Sender';
import Email from './Email';
import SlackIntegration from './SlackIntegration';

// Define associations
User.hasMany(Sender, { foreignKey: 'userId', as: 'senders' });
Sender.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Email, { foreignKey: 'userId', as: 'emails' });
Email.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Sender.hasMany(Email, { foreignKey: 'senderId', as: 'emails' });
Email.belongsTo(Sender, { foreignKey: 'senderId', as: 'sender' });

User.hasOne(SlackIntegration, { foreignKey: 'userId', as: 'slackIntegration' });
SlackIntegration.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export { User, Sender, Email, SlackIntegration };
