import {PropertyMetadata} from "./PropertyMetadata";
import {RelationTypes, RelationType} from "./types/RelationTypes";
import {EntityMetadata} from "./EntityMetadata";
import {OnDeleteType} from "./ForeignKeyMetadata";
import {JoinTableMetadata} from "./JoinTableMetadata";
import {JoinColumnMetadata} from "./JoinColumnMetadata";
import {RelationMetadataArgs} from "./args/RelationMetadataArgs";

/**
 * Function that returns a type of the field. Returned value must be a class used on the relation.
 */
export type RelationTypeInFunction = ((type?: any) => Function);


/**
 * Contains the name of the property of the object, or the function that returns this name.
 */
export type PropertyTypeInFunction<T> = string|((t: T) => string|any);


/**
 * Contains all information about some entity's relation.
 */
export class RelationMetadata extends PropertyMetadata {

    // ---------------------------------------------------------------------
    // Public Properties
    // ---------------------------------------------------------------------

    /**
     * Its own entity metadata.
     */
    entityMetadata: EntityMetadata;

    /**
     * Related entity metadata.
     */
    inverseEntityMetadata: EntityMetadata;

    /**
     * Junction entity metadata.
     */
    junctionEntityMetadata: EntityMetadata;

    /**
     * Join table metadata.
     */
    joinTable: JoinTableMetadata;

    /**
     * Join column metadata.
     */
    joinColumn: JoinColumnMetadata;
    
    // ---------------------------------------------------------------------
    // Readonly Properties
    // ---------------------------------------------------------------------

    /**
     * Indicates if this is a parent (can be only many-to-one relation) relation in the tree tables.
     */
    readonly isTreeParent: boolean = false;

    /**
     * Indicates if this is a children (can be only one-to-many relation) relation in the tree tables.
     */
    readonly isTreeChildren: boolean = false;

    /**
     * Relation type.
     */
    readonly relationType: RelationType;

    /**
     * If set to true then it means that related object can be allowed to be inserted to the db.
     */
    readonly isCascadeInsert: boolean;

    /**
     * If set to true then it means that related object can be allowed to be updated in the db.
     */
    readonly isCascadeUpdate: boolean;

    /**
     * If set to true then it means that related object can be allowed to be remove from the db.
     */
    readonly isCascadeRemove: boolean;

    /**
     * Indicates if relation column value can be nullable or not.
     */
    readonly isNullable: boolean = true;

    /**
     * Old column name.
     */
    readonly oldColumnName: string;

    /**
     * What to do with a relation on deletion of the row containing a foreign key.
     */
    readonly onDelete: OnDeleteType;

    /**
     * The real reflected property type.
     */
    readonly propertyType: any;

    // ---------------------------------------------------------------------
    // Private Properties
    // ---------------------------------------------------------------------

    /**
     * The type of the field.
     */
    private _type: RelationTypeInFunction;

    /**
     * Inverse side of the relation.
     */
    private _inverseSideProperty: PropertyTypeInFunction<any>;

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(args: RelationMetadataArgs) {
        super(args.target, args.propertyName);
        this.relationType = args.relationType;
        
        if (args.inverseSideProperty)
            this._inverseSideProperty = args.inverseSideProperty;
        if (args.propertyType)
            this.propertyType = args.propertyType;
        if (args.options.cascadeInsert || args.options.cascadeAll)
            this.isCascadeInsert = true;
        if (args.options.cascadeUpdate || args.options.cascadeAll)
            this.isCascadeUpdate = true;
        if (args.options.cascadeRemove || args.options.cascadeAll)
            this.isCascadeRemove = true;
        if (args.options.oldColumnName)
            this.oldColumnName = args.options.oldColumnName;
        if (args.options.nullable)
            this.isNullable = args.options.nullable;
        if (args.options.onDelete)
            this.onDelete = args.options.onDelete;
        if (args.isTreeParent)
            this.isTreeParent = true;
        if (args.isTreeChildren)
            this.isTreeChildren = true;

        if (!this._type)
            this._type = args.type;
    }

    // ---------------------------------------------------------------------
    // Accessors
    // ---------------------------------------------------------------------

    /**
     * Gets the name of column in the database. 
     * Cannot be used with many-to-many relations since they don't have a column in the database.
     * Also only owning sides of the relations have this property.
     */
    get name(): string {
        
        // todo: maybe need to throw exception if its a many-to-many relation?
        
        if (this.joinColumn && this.joinColumn.name)
            return this.entityMetadata.namingStrategy.relationNameCustomized(this.joinColumn.name);
        
        return this.entityMetadata.namingStrategy.relationName(this.propertyName);
    }

    /**
     * Gets the name of column to which this relation is referenced. 
     * Cannot be used with many-to-many relations since all referenced are in the junction table.
     * Also only owning sides of the relations have this property.
     */
    get referencedColumnName(): string {
        if (this.joinColumn && this.joinColumn.referencedColumn && this.joinColumn.referencedColumn.name)
            return this.joinColumn.referencedColumn.name;
        
        // todo: maybe join column should never be null, and this data should come from join column?
        return this.inverseEntityMetadata.primaryColumn.propertyName;
    }

    /**
     * Gets the property's type to which this relation is applied.
     */
    get type(): Function {
        return this._type();
    }

    /**
     * Checks if this relation is lazy-load style relation.
     */
    get isLazy(): boolean {
        return this.propertyType && this.propertyType.name && this.propertyType.name.toLowerCase() === "promise";
    }

    /**
     * Indicates if this side is an owner of this relation.
     */
    get isOwning() {
        return  this.isManyToOne ||
            (this.isManyToMany && this.joinTable) ||
            (this.isOneToOne && this.joinColumn);
    }

    /**
     * Checks if this relation's type is "one-to-one".
     */
    get isOneToOne(): boolean {
        return this.relationType === RelationTypes.ONE_TO_ONE;
    }

    /**
     * Checks if this relation's type is "one-to-many".
     */
    get isOneToMany(): boolean {
        return this.relationType === RelationTypes.ONE_TO_MANY;
    }

    /**
     * Checks if this relation's type is "many-to-one".
     */
    get isManyToOne(): boolean {
        return this.relationType === RelationTypes.MANY_TO_ONE;
    }

    /**
     * Checks if this relation's type is "many-to-many".
     */
    get isManyToMany(): boolean {
        return this.relationType === RelationTypes.MANY_TO_MANY;
    }

    /**
     * Checks if inverse side is specified by a relation.
     */
    get hasInverseSide(): boolean {
        return this.inverseEntityMetadata && this.inverseEntityMetadata.hasRelationWithPropertyName(this.inverseSideProperty);
    }

    /**
     * Gets the property name of the inverse side of the relation.
     */
    get inverseSideProperty(): string {

        if (this._inverseSideProperty) {
            return this.computeInverseSide(this._inverseSideProperty);

        } else if (this.isTreeParent) {
            return this.entityMetadata.treeChildrenRelation.propertyName;

        } else if (this.isTreeChildren) {
            return this.entityMetadata.treeParentRelation.propertyName;

        }

        return "";
    }

    /**
     * Gets the relation metadata of the inverse side of this relation.
     */
    get inverseRelation(): RelationMetadata {
        const relation = this.inverseEntityMetadata.findRelationWithPropertyName(this.inverseSideProperty);
        if (!relation)
            throw new Error(`Inverse side was not found in the relation ${this.entityMetadata.name}#${this.inverseSideProperty}`);

        return relation;
    }

    // ---------------------------------------------------------------------
    // Private Methods
    // ---------------------------------------------------------------------

    private computeInverseSide(inverseSide: PropertyTypeInFunction<any>): string {
        const ownerEntityPropertiesMap = this.inverseEntityMetadata.createPropertiesMap();
        if (typeof inverseSide === "function")
            return (<Function> inverseSide)(ownerEntityPropertiesMap);
        if (typeof inverseSide === "string")
            return <string> inverseSide;

        // throw new Error("Cannot compute inverse side of the relation");
        return "";
    }

}