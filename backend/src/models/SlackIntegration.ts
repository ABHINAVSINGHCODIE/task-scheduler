import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface SlackIntegrationAttributes {
  id: string;
  userId: string;
  accessToken: string;
  webhookUrl: string;
  teamName: string;
  channelName: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SlackCreationAttributes extends Optional<SlackIntegrationAttributes, 'id' | 'isActive' | 'teamName' | 'channelName'> {}

class SlackIntegration extends Model<SlackIntegrationAttributes, SlackCreationAttributes> implements SlackIntegrationAttributes {
  public id!: string;
  public userId!: string;
  public accessToken!: string;
  public webhookUrl!: string;
  public teamName!: string;
  public channelName!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SlackIntegration.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    accessToken: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    webhookUrl: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    teamName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    channelName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'slack_integrations',
    modelName: 'SlackIntegration',
  }
);

export default SlackIntegration;
