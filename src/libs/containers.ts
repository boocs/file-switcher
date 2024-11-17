
export class MapQueue extends Map<string, string> {
	private _maxSize;

	public constructor(maxSize: number){
		super();
		this._maxSize = maxSize;
	}

	private pop() {
		if(this.size === 0) {return;}   

		const [firstKey] = this.keys();
		return this.delete(firstKey);
	}

	public set(key: string, value: string): this {
		
		if(this.size >= this._maxSize){
			this.pop();
		}

		return super.set(key, value);
	}

	public set maxSize(size: number){
		this._maxSize = size;
		if(!(this.size > size)){
			return;
		}
        
		do {
			this.pop();
		} while (this.size > size);
	}

	public get maxSize() {
		return this._maxSize;
	}

	/**
	 * 
	 * @returns Estimated memory size in bytes
	 */
	public getEstMemorySize(): number {
		let size = 0;
        for (const [key, value] of this.entries()) {
            size += new TextEncoder().encode(key).length; // Add the byte length of the key
            size += new TextEncoder().encode(value).length; // Add the byte length of the value
        }
        return size;
	}
}