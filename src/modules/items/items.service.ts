import { NotFoundException } from "@/common/exceptions/http.exception"
import type { CreateItemDto, UpdateItemDto } from "./items.dto"
import type { ItemEntity } from "./items.entity"
import type { ItemsRepository } from "./items.repository"

export class ItemsService {
  constructor(private readonly itemsRepository: ItemsRepository) {}

  async findAll(): Promise<ItemEntity[]> {
    return this.itemsRepository.findAll()
  }

  async findById(id: string): Promise<ItemEntity> {
    const item = await this.itemsRepository.findById(id)
    if (!item) {
      throw new NotFoundException(`Item ${id} not found`)
    }
    return item
  }

  async create(dto: CreateItemDto): Promise<ItemEntity> {
    return this.itemsRepository.create(dto)
  }

  async update(id: string, dto: UpdateItemDto): Promise<ItemEntity> {
    const updated = await this.itemsRepository.update(id, dto)
    if (!updated) {
      throw new NotFoundException(`Item ${id} not found`)
    }
    return updated
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.itemsRepository.delete(id)
    if (!deleted) {
      throw new NotFoundException(`Item ${id} not found`)
    }
  }
}
