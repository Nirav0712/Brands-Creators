import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CategoryStatus, CategoryType, CustomFieldType, UserRole, ICategoryCustomField } from '@brands-creators/types';

export type CategoryDocument = Category & Document;

@Schema({ _id: false, timestamps: false })
export class CategoryCustomField implements ICategoryCustomField {
  @Prop({ required: true, trim: true })
  key: string;

  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ type: String, enum: CustomFieldType, default: CustomFieldType.TEXT })
  type: CustomFieldType;

  @Prop({ type: [String], default: [] })
  options?: string[];

  @Prop({ default: false })
  required: boolean;

  @Prop({ trim: true })
  placeholder?: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ type: Object })
  defaultValue?: any;
}

export const CategoryCustomFieldSchema = SchemaFactory.createForClass(CategoryCustomField);

@Schema({ _id: true, timestamps: false })
export class SubCategory {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true, default: 'Tag' })
  iconName?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  order: number;

  @Prop({ type: [String], default: [] })
  specializations?: string[];
}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ required: true, unique: true, trim: true, index: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true, default: 'Sparkles' })
  iconName?: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null, index: true })
  parentId?: Types.ObjectId;

  @Prop({ type: Number, default: 0, index: true })
  level: number; // 0 = Root, 1 = Subcategory, 2 = Specialization

  @Prop({ type: String, enum: CategoryType, default: CategoryType.ALL, index: true })
  type: CategoryType;

  @Prop({ type: String, enum: CategoryStatus, default: CategoryStatus.ACTIVE, index: true })
  status: CategoryStatus;

  @Prop({ default: false, index: true })
  featured: boolean;

  @Prop({ default: 0, index: true })
  sortOrder: number;

  @Prop({ trim: true })
  seoTitle?: string;

  @Prop({ trim: true })
  seoDescription?: string;

  @Prop({ type: [SubCategorySchema], default: [] })
  subcategories: SubCategory[];

  @Prop({
    type: [String],
    enum: UserRole,
    default: [UserRole.CREATOR, UserRole.BRAND, UserRole.PRODUCTION_TEAM],
    index: true,
  })
  supportedProfileTypes: UserRole[];

  @Prop({ type: [CategoryCustomFieldSchema], default: [] })
  customFields: CategoryCustomField[];

  @Prop({ default: true })
  allowOtherOption: boolean;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: 0 })
  order: number;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ isActive: 1, sortOrder: 1, order: 1 });
CategorySchema.index({ slug: 1, status: 1 });
CategorySchema.index({ parentId: 1, level: 1 });
CategorySchema.index({ featured: 1, status: 1 });

