import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type EmailStatus = 'scheduled' | 'queued' | 'sending' | 'sent' | 'failed';

interface EmailAttributes {
  id: string;
  idempotencyKey: string;
  userId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  sentAt: Date | null;
  status: EmailStatus;
  bullmqJobId: string;
  errorMessage: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EmailCreationAttributes extends Optional<EmailAttributes, 'id' | 'sentAt' | 'errorMessage' | 'bullmqJobId'> {}

class Email extends Model<EmailAttributes, EmailCreationAttributes> implements EmailAttributes {
  public id!: string;
  public idempotencyKey!: string;
  public userId!: string;
  public senderId!: string;
  public recipientEmail!: string;
  public subject!: string;
  public body!: string;
  public scheduledAt!: Date;
  public sentAt!: Date | null;
  public status!: EmailStatus;
  public bullmqJobId!: string;
  public errorMessage!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Email.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    idempotencyKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'senders',
        key: 'id',
      },
    },
    recipientEmail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'queued', 'sending', 'sent', 'failed'),
      allowNull: false,
      defaultValue: 'scheduled',
    },
    bullmqJobId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'emails',
    modelName: 'Email',
    indexes: [
      { fields: ['userId', 'status'] },
      { fields: ['senderId'] },
      { fields: ['scheduledAt'] },
      { fields: ['idempotencyKey'], unique: true },
    ],
  }
);

export default Email;
