import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface SenderAttributes {
  id: string;
  userId: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SenderCreationAttributes extends Optional<SenderAttributes, 'id' | 'isActive'> {}

class Sender extends Model<SenderAttributes, SenderCreationAttributes> implements SenderAttributes {
  public id!: string;
  public userId!: string;
  public email!: string;
  public smtpHost!: string;
  public smtpPort!: number;
  public smtpUser!: string;
  public smtpPass!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Sender.init(
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
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    smtpHost: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    smtpPort: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    smtpUser: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    smtpPass: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'senders',
    modelName: 'Sender',
  }
);

export default Sender;
